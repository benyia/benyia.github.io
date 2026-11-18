%% =======================================================================
%  基于有限差分法的二维稳态温度场数值计算 —— 主要代码摘录
%  课程：数值分析          说明：完整可运行程序见报告附录
%  本文件只保留算法主干，可直接粘贴入报告正文"主要代码"一节
% =======================================================================

%% ================= 1. 主程序：参数设置与网格收敛性实验 =================
clear; clc; close all;

% ---- 物理参数：1 m × 1 m 金属薄板，左边界 100 degC，其余三边 0 degC
par.L  = 1.0;   par.W  = 1.0;
par.TL = 100;   par.TR = 0;    par.TB = 0;   par.TT = 0;
par.lambda_ = 45;                 % 导热系数 W/(m·K)，仅作工程背景说明

hList    = [0.1 0.05 0.025];      % 11×11 / 21×21 / 41×41
tol      = 1e-10;                 % 相对无穷范数残差收敛准则
maxIterS = 20000;

for h = hList
    nint = round(1/h) - 1;        % 每个方向的内部节点数
    N    = nint + 2;              % 每个方向的节点总数
    w    = 2/(1 + sin(pi*h));     % 理论最优松弛因子

    A = build_matrix(nint);       % 五点格式系数矩阵
    P = build_rhs(nint, par);     % 右端向量（边界温度已移入）

    [U, k, ~, ~] = solve_sor(A, P, nint, tol, maxIterS, w);
    T = assemble_field(U, nint, par);

    [errMax, errProbe, ~, ~, errReg] = eval_error(T, h, par);
    fprintf('h=%.3f  %dx%d  k=%4d  errMax=%.4e  errReg=%.4e  errProbe=%.4e\n', ...
            h, N, N, k, errMax, errReg, errProbe);
end

%% ================= 2. 五点格式系数矩阵与右端向量装配 ===================
function A = build_matrix(m)
% 组装五点格式对应的稀疏系数矩阵 A（m×m 阶）
% 对应方程：4*T(i,j) - T(i-1,j) - T(i+1,j) - T(i,j-1) - T(i,j+1) = P(i,j)
% 记 D 为二阶差分算子，则 A = kron(I,D) + kron(D,I)
    e = ones(m, 1);
    D = spdiags([-e 2*e -e], [-1 0 1], m, m);   % 二阶中心差分算子
    I = speye(m);
    A = kron(I, D) + kron(D, I);
end

function P = build_rhs(m, par)
% 由四条边的 Dirichlet 条件组装右端向量 P（返回 m*m 列向量）
% 边界温度全部移入右端，故迭代数组的边框恒为 0
    P = zeros(m, m);
    P(:, 1)   = P(:, 1)   + par.TL;   % 左边界 x = 0
    P(:, end) = P(:, end) + par.TR;   % 右边界 x = L
    P(1, :)   = P(1, :)   + par.TB;   % 下边界 y = 0
    P(end, :) = P(end, :) + par.TT;   % 上边界 y = W
    P = P(:);
end

%% ================= 3. 三种迭代求解（Jacobi / Gauss-Seidel / SOR） ======
function U = init_field(m)
    U = zeros(m+2, m+2);   % 四周补零边框，内部 U(2:m+1,2:m+1) 为未知量
end

function B = pad_rhs(P, m)
% 把右端向量还原为带零边框的 (m+2)×(m+2) 矩阵，与 U 同形
    B = zeros(m+2, m+2);
    B(2:end-1, 2:end-1) = reshape(P, m, m);
end

function [U, k, res, t] = solve_jacobi(A, P, m, tol, maxIter)
% 点 Jacobi 迭代：所有节点同时使用上一轮值更新，完全向量化
    U = init_field(m);  B = pad_rhs(P, m);
    res = zeros(maxIter, 1);  t = tic;
    for k = 1:maxIter
        N    = U(1:end-2, 2:end-1) + U(3:end, 2:end-1) ...
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
% 点 Gauss-Seidel 迭代：按行优先顺序逐点更新，邻居中的新值立即参与计算
    U = init_field(m);  B = pad_rhs(P, m);
    res = [];  k = 0;  t = tic;
    for k = 1:maxIter
        for i = 2:m+1
            for j = 2:m+1
                U(i,j) = 0.25*(B(i,j) + U(i-1,j) + U(i+1,j) + U(i,j-1) + U(i,j+1));
            end
        end
        if mod(k, checkFreq) == 0 || k == 1
            res(end+1, 1) = relres(A, P, U, m);   % 每 checkFreq 次检查一次残差
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

%% ================= 4. 解析级数解（精度验证基准） ======================
function Tex = exact_solution(x, y, par, nTerm)
% 矩形区域 Laplace 方程的级数解（左边界 TL，其余三边为 0）：
%   T(x,y) = (4TL/pi) * SUM_{n odd} [sinh(n*pi*(L-x)/L)/sinh(n*pi)] * sin(n*pi*y/W)/n
% 直接计算 sinh 比值在 n 较大时会溢出为 Inf/Inf = NaN，故改写为等价指数形式：
%   sinh(n*pi*(L-x)/L)/sinh(n*pi)
%     = exp(-n*pi*x/L) * (1 - exp(-2*n*pi*(L-x)/L)) / (1 - exp(-2*n*pi))
    [X, Y] = meshgrid(x, y);
    Tex = zeros(size(X));
    for n = 1:2:nTerm
        e1 = exp(-n*pi*X/par.L);                    % exp(-n*pi*x/L)
        e2 = exp(-2*n*pi*(par.L - X)/par.L);        % exp(-2*n*pi*(L-x)/L)
        e3 = exp(-2*n*pi);                          % exp(-2*n*pi)
        ratio = e1 .* (1 - e2) ./ (1 - e3);
        Tex = Tex + (4*par.TL/(n*pi)) * ratio .* sin(n*pi*Y/par.W);
    end
end

%% ================= 5. 误差统计（三种口径） ============================
function [errMax, errProbe, Tprobe, TexProbe, errReg] = eval_error(T, h, par)
% errMax   —— 全部内部节点的最大绝对误差（受角点奇异支配）
% errReg   —— 固定物理区域 0.2 <= x,y <= 0.8 内的最大绝对误差（口径与网格无关）
% errProbe —— 非对称探测点 (0.3 m, 0.7 m) 处的绝对误差
    n   = size(T, 1) - 1;
    xi  = (0:n)'*h;
    Tex = exact_solution(xi, xi, par, 401);         % 取前 401 项奇数项
    D    = T - Tex;
    Dint = abs(D(2:end-1, 2:end-1));
    errMax = max(Dint(:));

    xiInt = xi(2:end-1);
    inReg = (xiInt >= 0.2-1e-9) & (xiInt <= 0.8+1e-9);
    Ar = Dint;  Ar(~inReg, :) = NaN;  Ar(:, ~inReg) = NaN;
    errReg = max(Ar(:));

    ip = round(0.7/h) + 1;  jp = round(0.3/h) + 1;  % 行对应 y，列对应 x
    Tprobe   = T(ip, jp);
    TexProbe = Tex(ip, jp);
    errProbe = abs(Tprobe - TexProbe);
end

%% ================= 6. 温度场重构 ======================================
function T = assemble_field(U, m, par)
% 由内部节点解还原 (m+2)×(m+2) 完整温度场（含四条边 Dirichlet 条件）
    T = U;
    T(1, :)   = par.TB;       % 下边界 y = 0
    T(end, :) = par.TT;       % 上边界 y = W
    T(:, 1)   = par.TL;       % 左边界 x = 0
    T(:, end) = par.TR;       % 右边界 x = L
end
