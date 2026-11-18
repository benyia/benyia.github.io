%%=======================================================================
%  工程案例大作业：基于有限差分法的二维稳态温度场数值计算与分析
%  课程名称：数值分析
%
%  程序结构：
%   第1 部分（主程序）  参数设置、三组数值实验、结果统计与绘图输出
%   第 2 部分          五点格式差分方程的矩阵装配
%   第 3 部分          线性方程组的迭代求解（Jacobi / Gauss-Seidel / SOR）
%   第 4 部分          解析级数解的构造（作为精度检验基准）
%   第 5 部分          辅助函数（场重构、误差统计、残差、绘图）
%
%  说明：本程序不使用任何商业求解器，全部算法均自行实现。
%%=======================================================================
clear; clc; close all;

%% ================= 第 1 部分：参数设置 ================================
% ---- 1.1 物理参数：1 m x 1 m 金属薄板，左边界恒温 100 degC，其余三边 0 degC
par.L  = 1.0;            % 板长 (m)，x 方向
par.W  = 1.0;            % 板宽 (m)，y 方向
par.TL = 100;            % 左边界温度 (degC)
par.TR = 0;              % 右边界温度 (degC)
par.TB = 0;              % 下边界温度 (degC)
par.TT = 0;              % 上边界温度 (degC)
par.lambda_ = 45;        % 导热系数 (W/(m·K))，仅作工程背景说明

% ---- 1.2 网格设置：h = 0.1 / 0.05 / 0.025 m（节点数 11 / 21 / 41）
hList = [0.1 0.05 0.025];

% ---- 1.3 迭代参数
tol       = 1e-10;             % 相对残差收敛准则
maxIterJ  = 50000;             % Jacobi      最大迭代次数
maxIterG  = 200000;            % Gauss-Seidel 最大迭代次数
maxIterS  = 20000;             % SOR         最大迭代次数
checkFreq = 10;                % Gauss-Seidel 每 10 次迭代检查一次残差
omegaList = 1.00:0.05:1.95;    % 松弛因子扫描范围（敏感性分析）

outDir = fullfile(fileparts(mfilename('fullpath')), 'results');
if ~exist(outDir, 'dir'); mkdir(outDir); end

fprintf('============================================================\n');
fprintf(' 二维稳态温度场有限差分法数值计算\n');
fprintf('============================================================\n');

%% ================= 实验一：网格收敛性 ==================================
% 采用理论最优松弛因子 omega = 2/(1+sin(pi*h))，以突出网格精度本身的影响
fprintf('\n【实验一】网格收敛性实验（SOR，理论最优 omega）\n');
fprintf('%8s %10s %12s %12s %18s %18s\n', ...
        'h','网格','迭代次数','时间(s)','内部最大误差','探测点误差');

result = struct();
for ig = 1:numel(hList)
    h    = hList(ig);
    nint = round(1/h) - 1;                  % 每个方向的内部节点数
    N    = nint + 2;                        % 每个方向的节点总数
    w    = 2/(1 + sin(pi*h));               % 理论最优松弛因子

    A = build_matrix(nint);                 % 装配五点格式系数矩阵
    P = build_rhs(nint, par);               % 装配右端向量（含边界贡献）

    [U, kS, resS, tS] = solve_sor(A, P, nint, tol, maxIterS, w);
    T = assemble_field(U, nint, par);
    [errMax, errProbe, Tprobe, TexProbe, errCorner, errReg, xMax, yMax] = ...
        eval_error(T, h, par);

    result(ig).h = h;  result(ig).nint = nint;  result(ig).N = N;
    result(ig).omega = w;  result(ig).k = kS;   result(ig).t = tS;
    result(ig).res = resS(end);
    result(ig).err = errMax;  result(ig).errProbe = errProbe;
    result(ig).errCorner = errCorner;
    result(ig).errReg = errReg;
    result(ig).xAtMax = xMax;  result(ig).yAtMax = yMax;
    result(ig).Tprobe = Tprobe;  result(ig).TexProbe = TexProbe;
    result(ig).T = T;
    % 工程关注量：最高温度（热点）与区域平均温度
    result(ig).Tmax = max(T(:));
    result(ig).Tmean = mean(T(:));

    fprintf('%8.3f %6dx%-4d %12d %12.4f %14.6e %14.6e %14.6e %14.6e  (%4.2f,%4.2f)\n', ...
            h, N, N, kS, tS, errMax, errCorner, errReg, errProbe, xMax, yMax);
end

%% ================= 实验二：三种迭代方法效率对比 =======================
fprintf('\n【实验二】Jacobi / Gauss-Seidel / SOR 迭代效率对比\n');
fprintf('%12s %16s %12s %12s %14s %16s %16s %16s\n', ...
        '网格','方法','迭代次数','时间(s)','末残差','全部内点最大误差','固定区域最大误差','探测点误差');

cmp = {};
for ig = 2:numel(hList)                      % 21x21 与 41x41 两组网格
    h = hList(ig);  nint = round(1/h) - 1;  N = nint + 2;
    w  = 2/(1 + sin(pi*h));
    A = build_matrix(nint);  P = build_rhs(nint, par);

    [U1,k1,r1,t1] = solve_jacobi(A, P, nint, tol, maxIterJ);
    [U2,k2,r2,t2] = solve_gs(A, P, nint, tol, maxIterG, checkFreq);
    [U3,k3,r3,t3] = solve_sor(A, P, nint, tol, maxIterS, w);

    [e1m, e1p, ~, ~, e1c, e1r] = eval_error(assemble_field(U1,nint,par), h, par);
    [e2m, e2p, ~, ~, e2c, e2r] = eval_error(assemble_field(U2,nint,par), h, par);
    [e3m, e3p, ~, ~, e3c, e3r] = eval_error(assemble_field(U3,nint,par), h, par);

    cmp(end+1,:) = {N, N, 'Jacobi',k1,t1,r1(end),e1m,e1c,e1r,e1p};               %#ok<AGROW>
    cmp(end+1,:) = {N, N, sprintf('Gauss-Seidel'),k2,t2,r2(end),e2m,e2c,e2r,e2p};%#ok<AGROW>
    cmp(end+1,:) = {N, N, sprintf('SOR(%1.2f)',w),k3,t3,r3(end),e3m,e3c,e3r,e3p};%#ok<AGROW>

    fprintf('%7dx%-5d %16s %12d %12.4f %14.3e %16.6e %16.6e %16.6e\n', N,N,'Jacobi',   k1,t1,r1(end),e1m,e1r,e1p);
    fprintf('%7s %16s %12d %12.4f %14.3e %16.6e %16.6e %16.6e\n', '','Gauss-Seidel',k2,t2,r2(end),e2m,e2r,e2p);
    fprintf('%7s %16s %12d %12.4f %14.3e %16.6e %16.6e %16.6e\n', '',sprintf('SOR(%1.2f)',w),k3,t3,r3(end),e3m,e3r,e3p);
end

%% ================= 实验三：松弛因子敏感性分析 =========================
fprintf('\n【实验三】松弛因子 omega 对收敛速度的影响（21x21 网格）\n');
h = hList(2);  nint = round(1/h) - 1;
A = build_matrix(nint);  P = build_rhs(nint, par);
fprintf('%8s %12s %12s\n','omega','迭代次数','时间(s)');
scan = [];
for w = omegaList
    [~, kw, ~, tw] = solve_sor(A, P, nint, tol, maxIterS, w);
    scan(end+1,:) = [w, kw, tw];                                          %#ok<AGROW>
    fprintf('%8.2f %12d %12.4f\n', w, kw, tw);
end

%% ================= 结果数据输出（供报告引用） =========================
fid = fopen(fullfile(outDir,'result_table.txt'),'w');
fprintf(fid,'二维稳态温度场有限差分计算结果汇总\n');
fprintf(fid,'收敛准则：相对无穷范数残差||Ax-b||_inf/||b||_inf < %.0e\n\n', tol);
fprintf(fid,'一、网格收敛性实验（SOR，理论最优 omega）\n');
fprintf(fid,'%8s %10s %10s %12s %12s %18s %18s %18s %18s\n', ...
        'h','网格','omega','迭代次数','时间(s)','全部内点最大误差','角点外最大误差', ...
        '固定区域最大误差','探测点误差');
for ig = 1:numel(result)
    fprintf(fid,'%8.3f %6dx%-4d %10.4f %12d %12.4f %18.10e %18.10e %18.10e %18.10e\n', ...
        result(ig).h, result(ig).N, result(ig).N, result(ig).omega, ...
        result(ig).k, result(ig).t, result(ig).err, result(ig).errCorner, ...
        result(ig).errReg, result(ig).errProbe);
end
fprintf(fid,'\n二、迭代方法效率对比\n');
fprintf(fid,'%12s %16s %12s %12s %14s %18s %18s %18s %18s\n', ...
        '网格','方法','迭代次数','时间(s)','末残差','全部内点最大误差','角点外最大误差', ...
        '固定区域最大误差','探测点误差');
for i = 1:size(cmp,1)
    fprintf(fid,'%7dx%-5d %16s %12d %12.4f %14.3e %18.10e %18.10e %18.10e %18.10e\n', ...
        cmp{i,1},cmp{i,2},cmp{i,3},cmp{i,4},cmp{i,5},cmp{i,6},cmp{i,7},cmp{i,8}, ...
        cmp{i,9},cmp{i,10});
end
fprintf(fid,'\n三、松弛因子敏感性（21x21 网格）\n');
fprintf(fid,'%8s %12s %12s\n','omega','迭代次数','时间(s)');
for i = 1:size(scan,1)
    fprintf(fid,'%8.2f %12d %12.4f\n', scan(i,1), scan(i,2), scan(i,3));
end
fclose(fid);

% 收敛阶估计：p = ln(e1/e2)/ln(h1/h2)，理论上应为 2
fprintf('\n【网格收敛阶估计】理论上二阶中心差分格式p = 2\n');
for ig = 2:numel(result)
    r = log(result(ig-1).h / result(ig).h);
    pAll = log(result(ig-1).err / result(ig).err) / r;
    pReg = log(result(ig-1).errReg / result(ig).errReg) / r;
    pPro = log(result(ig-1).errProbe / result(ig).errProbe) / r;
    fprintf('  h: %.3f -> %.3f   全部内点 p = %.4f   固定区域 p = %.4f   探测点 p = %.4f\n', ...
            result(ig-1).h, result(ig).h, pAll, pReg, pPro);
end
fid2 = fopen(fullfile(outDir,'convergence_order.txt'),'w');
for ig = 2:numel(result)
    r = log(result(ig-1).h / result(ig).h);
    pAll = log(result(ig-1).err / result(ig).err) / r;
    pReg = log(result(ig-1).errReg / result(ig).errReg) / r;
    pPro = log(result(ig-1).errProbe / result(ig).errProbe) / r;
    fprintf(fid2,'h: %.3f -> %.3f   全部内点 p = %.6f   固定区域 p = %.6f   探测点 p = %.6f\n', ...
            result(ig-1).h, result(ig).h, pAll, pReg, pPro);
end
fclose(fid2);

% 工程量汇总
fid3 = fopen(fullfile(outDir,'engineering_data.txt'),'w');
fprintf(fid3,'各网格下的工程关注量与探测点温度\n');
fprintf(fid3,'%8s %10s %14s %14s %14s %14s\n', ...
        'h','网格','最高温度/degC','平均温度/degC','探测点数值解','探测点级数解');
for ig = 1:numel(result)
    fprintf(fid3,'%8.3f %6dx%-4d %14.6f %14.6f %14.6f %14.6f\n', ...
        result(ig).h, result(ig).N, result(ig).N, ...
        result(ig).Tmax, result(ig).Tmean, ...
        result(ig).Tprobe, result(ig).TexProbe);
end
fclose(fid3);
fprintf('\n');

save(fullfile(outDir,'result_data.mat'), 'result', 'cmp', 'scan', '-v7');

%% ================= 图 1：物理模型示意图 ===============================
% 图中只画物理模型本身，图号与图题统一由报告正文的题注给出
fig = figure('Color','w','Position',[100 100 660 560]);
patch('XData',[0 par.L par.L 0],'YData',[0 0 par.W par.W], ...
      'FaceColor',[0.93 0.95 0.98],'EdgeColor',[0.15 0.25 0.45],'LineWidth',2);
hold on;
% 左边界：恒温高温壁面（红色粗线）
plot([0 0],[0 par.W],'r-','LineWidth',7);
text(-0.06, par.W/2, sprintf('T = %g degC', par.TL), ...
     'Color','r','FontSize',13,'HorizontalAlignment','right','VerticalAlignment','middle');
% 上、下、右三边：低温壁面（绿色粗线）
plot([par.L par.L],[0 par.W],'Color',[0.10 0.45 0.20],'LineWidth',7);
plot([0 par.L],[0 0],'Color',[0.10 0.45 0.20],'LineWidth',7);
plot([0 par.L],[par.W par.W],'Color',[0.10 0.45 0.20],'LineWidth',7);
text(par.L+0.06, par.W/2, sprintf('T = %g degC', par.TB), ...
     'Color',[0.10 0.45 0.20],'FontSize',13,'HorizontalAlignment','left','VerticalAlignment','middle');
text(par.L/2, par.W+0.06, sprintf('T = %g degC', par.TB), ...
     'Color',[0.10 0.45 0.20],'FontSize',13,'HorizontalAlignment','center','VerticalAlignment','bottom');
text(par.L/2, -0.07, sprintf('T = %g degC', par.TB), ...
     'Color',[0.10 0.45 0.20],'FontSize',13,'HorizontalAlignment','center','VerticalAlignment','top');
% 板内工况说明
text(par.L/2, par.W/2+0.07, '板内无热源，稳态导热', ...
     'FontSize',12,'HorizontalAlignment','center','Color',[0.20 0.20 0.20]);
text(par.L/2, par.W/2-0.01, sprintf('\\lambda = %g W/(m·K)', par.lambda_), ...
     'FontSize',12,'HorizontalAlignment','center','Color',[0.20 0.20 0.20]);
text(par.L/2, par.W/2-0.09, sprintf('L = %g m,  W = %g m', par.L, par.W), ...
     'FontSize',12,'HorizontalAlignment','center','Color',[0.20 0.20 0.20]);
% 坐标方向标注
text(par.L/2, -0.32, 'x / m','FontSize',12,'HorizontalAlignment','center');
text(-0.75, par.W/2, 'y / m','FontSize',12,'HorizontalAlignment','center', ...
     'VerticalAlignment','middle','Rotation',90);
axis([-0.90 1.50 -0.50 1.35]); axis equal; axis off
exportgraphics(fig, fullfile(outDir,'fig1_model.png'), 'Resolution',200);

%% ================= 图 2：计算区域网格划分 =============================
draw_mesh_figure(result(2), outDir);

%% ================= 图 3：三种迭代方法收敛曲线 =========================
draw_conv_figure(hList(3), outDir, tol, maxIterJ, maxIterG, maxIterS, checkFreq);

%% ================= 图 4：网格收敛性 ===================================
fig = figure('Color','w','Position',[100 100 700 520]);
hh = [result.h];  eMax = [result.err];  eReg = [result.errReg];
% 固定区域误差（远离角点）应与二阶参考线平行；全内部节点最大误差被角点奇异主导，呈平台状
loglog(hh, eReg, 'o-','LineWidth',1.8,'MarkerFaceColor','b','MarkerSize',8); hold on
loglog(hh, eReg(1)*(hh/hh(1)).^2, 'm--','LineWidth',1.5);
loglog(hh, eMax, 's--','Color',[0.60 0.20 0.20],'LineWidth',1.6, ...
       'MarkerFaceColor',[0.60 0.20 0.20],'MarkerSize',7);
grid on; box on;
xlabel('网格步长 h / m','FontSize',12); ylabel('最大绝对误差 / degC','FontSize',12);
legend('固定区域 [0.2,0.8]×[0.2,0.8] 最大误差','二阶精度参考线', ...
       '全内部节点最大误差','Location','southwest');
set(gca,'FontSize',11);
exportgraphics(fig, fullfile(outDir,'fig4_gridconv.png'), 'Resolution',200);

%% ================= 图 5：温度分布云图 ================================
draw_field_figure(result(3), outDir, 'fig5_contourf.png', true,  false);

%% ================= 图 6：等温线图 =====================================
draw_field_figure(result(3), outDir, 'fig6_isotherm.png', true, true);

%% ================= 图 7：不同网格下 y=0.5 m 截面温度分布 ==============
fig = figure('Color','w','Position',[100 100 720 520]);
hold on; mk = {'b-o','g-s','m-^'}; lbl = {};
for ig = 1:numel(result)
    hh = result(ig).h;  N = result(ig).N;
    xn = (0:N-1)*hh;
    Ti = interp2(0:N-1, 0:N-1, result(ig).T, 0:N-1, 0.5, 'linear');
    Ti = Ti(:);
    plot(xn, Ti, mk{ig}, 'LineWidth',1.6, 'MarkerSize',6);
    lbl{ig} = sprintf('h = %.3f m (%d×%d)', hh, N, N); %#ok<AGROW>
end
xe = linspace(0, 1, 400);
% 注意：此处 y 必须传标量。若传入向量，exact_solution 内部的 meshgrid 会
% 返回矩阵，plot 会把它当作多条曲线绘制，造成曲线被涂抹成黑色色块。
plot(xe, exact_solution(xe, 0.5, par, 401), 'k-', 'LineWidth',2.2);
lbl{end+1} = '级数解析解';
grid on; box on;
xlabel('x / m','FontSize',12); ylabel('温度 / degC','FontSize',12);
legend(lbl, 'Location','southwest'); set(gca,'FontSize',11);
exportgraphics(fig, fullfile(outDir,'fig7_profile.png'), 'Resolution',200);

fprintf('\n计算完成，结果已输出至：%s\n', outDir);
fprintf('============================================================\n');

%% ================= 第 2 部分：五点格式差分方程的矩阵装配 ==============
function A = build_matrix(m)
% 组装五点格式对应的稀疏系数矩阵 A（m*m 阶，列主序与 x(:) 一致）
% 对应方程：4*T(i,j) - T(i-1,j) - T(i+1,j) - T(i,j-1) - T(i,j+1) = P(i,j)
% 其中 D 为二阶差分算子，则 A = kron(I,D) + kron(D,I)。
    e = ones(m, 1);
    D = spdiags([-e 2*e -e], [-1 0 1], m, m);   % 二阶中心差分算子
    I = speye(m);
    A = kron(I, D) + kron(D, I);
end

function P = build_rhs(m, par)
% 由四条边的 Dirichlet 条件组装右端向量 P（返回 m*m 列向量）
% 四条边的温度贡献已移入右端，故迭代数组 U 的边框恒为 0
    P = zeros(m, m);
    P(:, 1)   = P(:, 1)   + par.TL;   % 左边界 x = 0
    P(:, end) = P(:, end) + par.TR;   % 右边界 x = L
    P(1, :)   = P(1, :)   + par.TB;   % 下边界 y = 0
    P(end, :) = P(end, :) + par.TT;   % 上边界 y = W
    P = P(:);
end

%% ================= 第 3 部分：线性方程组的迭代求解 =====================
function U = init_field(m)
    U = zeros(m+2, m+2);   % 四周补零边框，内部 U(2:m+1, 2:m+1) 为 m*m 未知量
end

function B = pad_rhs(P, m)
% 把右端向量还原为带零边框的 (m+2)*(m+2) 矩阵，与 U 同形
    B = zeros(m+2, m+2);
    B(2:end-1, 2:end-1) = reshape(P, m, m);
end

function [U, k, res, t] = solve_jacobi(A, P, m, tol, maxIter)
% 点Jacobi 迭代：所有节点同时用上一轮值更新，完全向量化
    U = init_field(m);  B = pad_rhs(P, m);
    res = zeros(maxIter, 1);  t = tic;
    for k = 1:maxIter
        N   = U(1:end-2, 2:end-1) + U(3:end, 2:end-1) ...
            + U(2:end-1, 1:end-2) + U(2:end-1, 3:end);
        Unew = zeros(m+2, m+2);
        Unew(2:end-1, 2:end-1) = 0.25*(B(2:end-1,2:end-1) + N);
        res(k) = relres(A, P, U, m);
        U = Unew;
        if res(k) < tol, break; end
    end
    res = res(1:k);  t = toc(t);
end

function [U, k, res, t] = solve_gs(A, P, m, tol, maxIter, checkFreq)
% 点 Gauss-Seidel 迭代：按行优先顺序逐点更新，
% 所用右、下、左邻居均为本轮已更新的新值，上邻居为本轮旧值
    U = init_field(m);  B = pad_rhs(P, m);
    res = [];  k = 0;  t = tic;
    for k = 1:maxIter
        for i = 2:m+1
            for j = 2:m+1
                U(i,j) = 0.25*(B(i,j) + U(i-1,j) + U(i+1,j) + U(i,j-1) + U(i,j+1));
            end
        end
        if mod(k, checkFreq) == 0 || k == 1
            res(end+1, 1) = relres(A, P, U, m);  %#ok<AGROW>
            if res(end) < tol, break; end
        end
    end
    t = toc(t);
end

function [U, k, res, t] = solve_sor(A, P, m, tol, maxIter, omega)
% 点超松弛（SOR）迭代：对 Gauss-Seidel 的更新量施加松弛因子 omega
    U = init_field(m);  B = pad_rhs(P, m);
    res = zeros(maxIter, 1);  t = tic;
    for k = 1:maxIter
        for i = 2:m+1
            for j = 2:m+1
                gs = 0.25*(B(i,j) + U(i-1,j) + U(i+1,j) + U(i,j-1) + U(i,j+1));
                U(i,j) = (1-omega)*U(i,j) + omega*gs;
            end
        end
        res(k) = relres(A, P, U, m);
        if res(k) < tol, break; end
    end
    res = res(1:k);  t = toc(t);
end

function r = relres(A, P, U, m)
% 相对无穷范数残差 ||Ax-b||_inf / ||b||_inf
    x = U(2:end-1, 2:end-1);
    r = norm(A*x(:) - P, inf) / max(norm(P, inf), eps);
end

%% ================= 第 4 部分：解析级数解 ==============================
function Tex = exact_solution(x, y, par, nTerm)
% 矩形区域 Laplace 方程的级数解（左边界 TL，其余三边为 0）：
%   T(x,y) = (4TL/pi) * SUM_{n odd} [sinh(n*pi*(L-x)/L)/sinh(n*pi)] * sin(n*pi*y/W)/n
% 该式在 x=0 处退化为傅里叶正弦级数 TL，在 x=L 及 y=0、W 处为 0。
%
% 注意：直接计算 sinh 比值在大 n 时会溢出为 Inf/Inf = NaN：以 n=401 为例，
% sinh(401*pi) 已远超双精度上限。因此这里用等价的指数形式改写
%   sinh(n*pi*(L-x)/L)/sinh(n*pi)
%     = exp(-n*pi*x/L) * (1 - exp(-2*n*pi*(L-x)/L)) / (1 - exp(-2*n*pi))
% 该形式只涉及负指数，不会溢出，x 较小时也能得到正确结果。
    [X, Y] = meshgrid(x, y);
    Tex = zeros(size(X));
    for n = 1:2:nTerm
        e1 = exp(-n*pi*X/par.L);                            % exp(-n*pi*x/L)
        e2 = exp(-2*n*pi*(par.L - X)/par.L);                % exp(-2*n*pi*(L-x)/L)
        e3 = exp(-2*n*pi);                                  % exp(-2*n*pi)
        ratio = e1 .* (1 - e2) ./ (1 - e3);
        Tex = Tex + (4*par.TL/(n*pi)) * ratio .* sin(n*pi*Y/par.W);
    end
end

%% ================= 第 5 部分：辅助函数 ================================
function T = assemble_field(U, m, par)
% 由内部节点解还原 (m+2)x(m+2) 完整温度场（含四条边 Dirichlet 条件）
    T = U;                    % 直接复用迭代结果，只替换四条边
    T(1, :)   = par.TB;       % 下边界 y = 0
    T(end, :) = par.TT;       % 上边界 y = W
    T(:, 1)   = par.TL;       % 左边界 x = 0
    T(:, end) = par.TR;       % 右边界 x = L
end

function [errMax, errProbe, Tprobe, TexProbe, errCorner, errReg, xAtMax, yAtMax] = ...
        eval_error(T, h, par)
% 与级数解析解比较。返回两类误差：
%   errMax     —— 全部内部节点的最大绝对误差（含角点邻域）
%   errCorner  —— 扣除四个角点邻域（每角 kn 层）后的最大绝对误差
%   errReg     —— 固定中心区域 0.2 <= x,y <= 0.8 内的最大绝对误差
% 说明：左边界 100 degC 与上、下边界 0 degC 在 (0,0)、(0,W) 两处不相容，
% 角点附近解存在奇异性，该邻域内误差收敛阶低于 2，会掩盖格式本身的精度，
% 故单独统计；统计时按 h 的固定层数（kn 层）扣除角点邻域，使三套网格口径一致。
% 另在非对称探测点 (x,y) = (0.3, 0.7) 处单独统计误差。
    kn = 3;                                     % 扣除的角点邻域层数（以网格步长为单位）
    n = size(T, 1) - 1;
    xi = (0:n)'*h;
    Tex = exact_solution(xi, xi, par, 401);
    D = T - Tex;
    Dint = D(2:end-1, 2:end-1);
    A = abs(Dint);
    errMax = max(A(:));
    % 最大误差出现的位置（用于判断误差是否被角点奇异主导）
    [~, idxMax] = max(A(:));
    [iMax, jMax] = ind2sub(size(A), idxMax);
    xiInt = xi(2:end-1);
    xAtMax = xiInt(jMax);  yAtMax = xiInt(iMax);
    % 扣除四个角点邻域后的最大误差
    m = size(A, 1);
    [I, J] = ndgrid(1:m, 1:m);                  % I 为 y 方向索引，J 为 x 方向索引
    corner = (I <= kn & J <= kn) | (I <= kn & J >= m-kn+1) | ...
             (I >= m-kn+1 & J <= kn) | (I >= m-kn+1 & J >= m-kn+1);
    Ac = A;  Ac(corner) = NaN;
    errCorner = max(Ac(:));
    % 固定物理区域 0.2 <= x,y <= 0.8 内的最大误差（口径与网格无关）
    inReg = (xiInt >= 0.2-1e-9) & (xiInt <= 0.8+1e-9);
    Ar = A;  Ar(~inReg, :) = NaN;  Ar(:, ~inReg) = NaN;
    errReg = max(Ar(:));
    % 探测点：距左边界 0.3 m、距下边界 0.7 m 处（该点恰落在网格节点上）
    % 行索引对应 y，列索引对应 x
    ip = round(0.7/h) + 1;  jp = round(0.3/h) + 1;
    Tprobe   = T(ip, jp);
    TexProbe = Tex(ip, jp);
    errProbe = abs(Tprobe - TexProbe);
end

function draw_mesh_figure(res, outDir)
% 图 2：计算区域网格划分
    h = res.h;
    [X, Y] = meshgrid(0:h:1, 0:h:1);
    T2 = interp2(X, Y, res.T, X, Y, 'linear');
    fig = figure('Color','w','Position',[100 100 640 560]);
    mesh(X, Y, T2, 'EdgeColor',[0.25 0.35 0.55], 'FaceColor','none', 'LineWidth',0.6);
    hold on; view(2); axis tight; box on;
    xlabel('x / m','FontSize',12); ylabel('y / m','FontSize',12);
    set(gca,'FontSize',11);
    exportgraphics(fig, fullfile(outDir,'fig2_mesh.png'), 'Resolution',200);
end

function draw_conv_figure(h, outDir, tol, maxIterJ, maxIterG, maxIterS, checkFreq)
% 图 3：三种迭代方法的收敛曲线
    nint = round(1/h) - 1;  N = nint + 2;
    w = 2/(1 + sin(pi*h));
    A = build_matrix(nint);
    P = build_rhs(nint, struct('TL',100,'TR',0,'TB',0,'TT',0));
    [~, ~, rj, ~] = solve_jacobi(A, P, nint, tol, maxIterJ);
    [~, ~, rg, ~] = solve_gs(A, P, nint, tol, maxIterG, checkFreq);
    [~, ~, rs, ~] = solve_sor(A, P, nint, tol, maxIterS, w);
    fig = figure('Color','w','Position',[100 100 720 540]);
    semilogy(1:numel(rj), rj, 'b-', 'LineWidth',1.8); hold on
    semilogy(checkFreq:checkFreq:numel(rg)*checkFreq, rg, 'r-', 'LineWidth',1.8);
    semilogy(1:numel(rs), rs, 'k--', 'LineWidth',1.8);
    set(gca,'YScale','log'); grid on; box on;
    xlabel('迭代次数','FontSize',12); ylabel('相对残差','FontSize',12);
    legend('Jacobi','Gauss-Seidel',sprintf('SOR(\\omega=%1.2f)',w), 'Location','southwest');
    set(gca,'FontSize',11); xlim([1 1e4]);
    exportgraphics(fig, fullfile(outDir,'fig3_convergence.png'), 'Resolution',200);
end

function draw_field_figure(res, outDir, fname, cbar, iso)
% 图 5 / 图 6：温度云图与等温线图
    h = res.h;
    [X, Y] = meshgrid(0:h:1, 0:h:1);
    T2 = interp2(X, Y, res.T, X, Y, 'linear');
    fig = figure('Color','w','Position',[100 100 660 580]);
    contourf(X, Y, T2, 20, 'LineStyle','none'); colormap(jet); hold on
    if cbar, colorbar; end
    if iso, contour(X, Y, T2, 20, 'k', 'LineWidth',1.1); end
    xlabel('x / m','FontSize',12); ylabel('y / m','FontSize',12);
    set(gca,'FontSize',11,'Layer','top'); box on;
    exportgraphics(fig, fullfile(outDir, fname), 'Resolution',200);
end
