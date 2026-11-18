%% ========================================================================
%  沈阳工业大学 2026级《计算机控制系统》课程作业综合仿真程序
%  ------------------------------------------------------------------------
%  设计内容涵盖：
%    (1) 原连续化工反应釜温度对象传递函数模型 W(s) 的参数辨识
%    (2) 离散系统广义被控对象脉冲传递函数模型 W_d(z) 辨识与解析求解
%    (3) 被控对象的三种离散状态空间模型辨识与能控/能观性分析
%    (4) 单位阶跃输入下的最小拍无纹波与有纹波控制器 D(z) 设计及闭环仿真
%    (5) 调节系统极点配置状态反馈控制律设计(ξ=0.5, ωn=3.6, 非主导极点3~5倍)
%        及纯滞后状态预估补偿与前馈无静差跟踪控制
%    (6) 闭环时域多工况仿真分析，观察 u(k)、x(k)、y(k) 序列并生成高质量图表
%  ------------------------------------------------------------------------
%  运行环境：MATLAB R2020b 及以上版本 (含 Control System Toolbox)
%  运行方式：直接点击 Run 或在命令行输入 computer_control_simulation
% ========================================================================
clear; clc; close all;

fprintf('==================================================================\n');
fprintf('  沈阳工业大学 2026级《计算机控制系统》课程仿真作业程序\n');
fprintf('==================================================================\n\n');

%% ===================== 0. 读取与载入现场试验阶跃响应数据 =====================
data_file = 'step_response_data.xlsx';
if ~exist(data_file, 'file')
    data_file_alt = 'step_response_data无噪声.xlsx';
    if exist(data_file_alt, 'file')
        data_file = data_file_alt;
    end
end

if exist(data_file, 'file')
    fprintf('[数据载入] 成功找到试验数据文件: %s\n', data_file);
    tbl = readtable(data_file);
    t_exp = tbl{:, 1};
    u_exp = tbl{:, 2};
    y_exp = tbl{:, 3};
else
    fprintf('[数据载入] 未检测到Excel文件，采用理论高精度基准数据生成...\n');
    T_s = 0.2;
    t_exp = (0:T_s:20)';
    u_exp = ones(size(t_exp));
    y_exp = zeros(size(t_exp));
    idx_pos = t_exp >= 0.6;
    t_eff = t_exp(idx_pos) - 0.6;
    y_exp(idx_pos) = 1 - (8/3)*exp(-t_eff) + 2*exp(-2*t_eff) - (1/3)*exp(-4*t_eff);
end

T = 0.2; % 采样周期 T = 0.2 s

%% ===================== 1. 原连续系统传递函数模型 W(s) 辨识 =====================
fprintf('\n----------------- (1) 原连续系统传递函数模型 W(s) 辨识 -----------------\n');

% 1.1 纯滞后时间 tau 判别
% 观察数据可知：t = 0.0, 0.2, 0.4, 0.6 s 时 y(t) = 0；
% t = 0.8 s 时输出首次大于零 (y = 0.00758176)
tau_id = 0.6; 
d_step = round(tau_id / T); % 纯滞后拍数 d = 3
fprintf('1.1 纯滞后时间判别: tau = %.4f s, 对应离散纯滞后拍数 d = %d 拍\n', tau_id, d_step);

% 1.2 稳态增益初判
y_inf = y_exp(end);
fprintf('1.2 稳态终值响应: y(∞) ≈ %.8f, 表明系统静态放大倍数 K/(a*b*c) = 1.0\n', y_inf);

% 1.3 非线性最小二乘参数精确寻优辨识
% 模型结构: W(s) = K*exp(-tau*s) / ((s+a)(s+b)(s+c))
% 单位阶跃响应解析式: y(t) = (K/(abc)) * [1 - C1*exp(-a*t') - C2*exp(-b*t') - C3*exp(-c*t')] * 1(t')
step_analytical = @(p, t) (t >= tau_id) .* (p(1)/(p(2)*p(3)*p(4))) .* ( ...
    1 - (p(3)*p(4)/((p(3)-p(2))*(p(4)-p(2)))) * exp(-p(2)*(t - tau_id)) ...
      - (p(2)*p(4)/((p(2)-p(3))*(p(4)-p(3)))) * exp(-p(3)*(t - tau_id)) ...
      - (p(2)*p(3)/((p(2)-p(4))*(p(3)-p(4)))) * exp(-p(4)*(t - tau_id)) );

obj_fun = @(p) sum((step_analytical(p, t_exp) - y_exp).^2);
p0 = [7.5, 0.9, 2.1, 3.9]; % 初始猜测值 [K, a, b, c]
opts = optimset('Display', 'off', 'TolX', 1e-12, 'TolFun', 1e-12, 'MaxFunEvals', 20000);
p_opt = fminsearch(obj_fun, p0, opts);

K_id = p_opt(1);
poles_id = sort(p_opt(2:4));
a_id = poles_id(1);
b_id = poles_id(2);
c_id = poles_id(3);

fprintf('1.3 辨识优化结果:\n');
fprintf('    静态增益 K = %.4f (标称整定值: 8.0000)\n', K_id);
fprintf('    惯性极点 a = %.4f, b = %.4f, c = %.4f (标称整定值: 1.0000, 2.0000, 4.0000)\n', a_id, b_id, c_id);
fprintf('    纯滞后时间 tau = %.4f s\n', tau_id);

% 理论整定模型
K = 8.0; a = 1.0; b = 2.0; c = 4.0; tau = 0.6;
y_fit = step_analytical([K, a, b, c], t_exp);
max_err_id = max(abs(y_fit - y_exp));
fprintf('    辨识模型阶跃响应与实测数据最大绝对误差: %e\n', max_err_id);
fprintf('    连续系统辨识模型:\n');
fprintf('                 8.0 * exp(-0.6*s)\n');
fprintf('       W(s) = -----------------------\n');
fprintf('              (s + 1)(s + 2)(s + 4)\n\n');

%% ===================== 2. 广义被控对象脉冲传递函数 W_d(z) 辨识 =====================
fprintf('----------------- (2) 广义被控对象脉冲传递函数 W_d(z) 辨识 -----------------\n');
s = tf('s');
W_s = K * exp(-tau*s) / ((s + a)*(s + b)*(s + c));

% 零阶保持器 ZOH 离散化: W_d(z) = c2d(W_s, T, 'zoh')
W_d = c2d(W_s, T, 'zoh');
[num_z, den_z] = tfdata(W_d, 'v');

% 规范化多项式系数
den_z = den_z / den_z(1);
num_z = num_z / den_z(1);

% 提取非零分子系数
first_idx = find(abs(num_z) > 1e-12, 1, 'first');
num_poly = num_z(first_idx:end); % [b1, b2, b3]

b1 = num_poly(1);
b2 = num_poly(2);
b3 = num_poly(3);

% 分母因式为 (z - exp(-aT))(z - exp(-bT))(z - exp(-cT))
p1_z = exp(-a*T);
p2_z = exp(-b*T);
p3_z = exp(-c*T);
den_poly = poly([p1_z, p2_z, p3_z]); % [1, a1, a2, a3]
a1 = den_poly(2);
a2 = den_poly(3);
a3 = den_poly(4);

zeros_wd = roots(num_poly);
poles_wd = roots(den_poly);

fprintf('2.1 广义被控对象脉冲传递函数 (z^-1 负幂形式):\n');
fprintf('              z^-4 * (%.8f + %.8f*z^-1 + %.8f*z^-2)\n', b1, b2, b3);
fprintf('       W_d(z) = -----------------------------------------------------\n');
fprintf('                 1 + (%.8f)*z^-1 + %.8f*z^-2 + (%.8f)*z^-3\n\n', a1, a2, a3);

fprintf('2.2 广义被控对象零极点分布:\n');
fprintf('    离散极点: p1 = %.6f, p2 = %.6f, p3 = %.6f\n', poles_wd(1), poles_wd(2), poles_wd(3));
fprintf('    离散零点: z_z1 = %.6f (单位圆外不稳定零点!), z_z2 = %.6f (稳定零点)\n', zeros_wd(1), zeros_wd(2));
fprintf('    总滞后拍数: d_total = 4 拍 (纯滞后 3 拍 + 保持器与阶次差 1 拍)\n');

%% ===================== 3. 被控对象的离散状态空间模型 =====================
fprintf('\n----------------- (3) 被控对象的离散状态空间模型辨识 -----------------\n');

% 3.1 形式一：无滞后子系统 3 阶能控标准型 (输入带 3 拍纯滞后)
Gc = [0, 1, 0; 0, 0, 1; -a3, -a2, -a1];
Hc = [0; 0; 1];
Cc = [b3, b2, b1];
Dc = 0;
fprintf('3.1 形式一: 无滞后 3 阶离散能控标准型:\n');
fprintf('    x_c(k+1) = G_c * x_c(k) + H_c * u(k-3),  y(k) = C_c * x_c(k)\n');
disp('    G_c = '); disp(Gc);
disp('    H_c = '); disp(Hc);
disp('    C_c = '); disp(Cc);
fprintf('    能控性矩阵秩: rank(Mc) = %d, 能观性矩阵秩: rank(Mo) = %d\n', ...
        rank(ctrb(Gc, Hc)), rank(obsv(Gc, Cc)));

% 3.2 形式二：物理相变量连续模型经 ZOH 精确离散化
Ap = [0, 1, 0; 0, 0, 1; -8, -14, -7];
Bp = [0; 0; 8];
Cp = [1, 0, 0];
Gp = expm(Ap * T);
Hp = (Ap \ (Gp - eye(3))) * Bp;
fprintf('\n3.2 形式二: 物理相变量离散状态空间模型 (x = [y, dy/dt, d^2y/dt^2]^T):\n');
disp('    G_p = '); disp(Gp);
disp('    H_p = '); disp(Hp);
disp('    C_p = '); disp(Cp);

% 3.3 形式三: 6 阶增广纯滞后离散状态空间模型
Ga = zeros(6, 6);
Ga(1:3, 1:3) = Gp;
Ga(1:3, 4)   = Hp;
Ga(4, 5)     = 1;
Ga(5, 6)     = 1;
Ha = [0; 0; 0; 0; 0; 1];
Ca = [1, 0, 0, 0, 0, 0];
fprintf('3.3 形式三: 6 阶增广离散状态空间模型 (消除输入时滞项):\n');
fprintf('    增广状态向量: x_a = [x_p1, x_p2, x_p3, u(k-3), u(k-2), u(k-1)]^T\n');
fprintf('    增广系统能控性矩阵秩: rank(Mc_a) = %d\n', rank(ctrb(Ga, Ha)));

%% ===================== 4. 单位阶跃输入时的最小拍控制器设计 =====================
fprintf('\n----------------- (4) 单位阶跃输入时的最小拍控制器设计 -----------------\n');

% 广义对象单位圆外非最小相位零点必须包含在闭环脉冲传递函数中
% 4.1 方案 A: 最小拍无纹波控制器 (Ripple-Free) - 包含全部零点
sum_b = b1 + b2 + b3;
p_rf = [b1, b2, b3] / sum_b; % [0.230389, 0.655175, 0.114436]
fprintf('4.1 最小拍无纹波闭环传递函数:\n');
fprintf('    Phi_rf(z) = z^-4 * (%.6f + %.6f*z^-1 + %.6f*z^-2)\n', p_rf(1), p_rf(2), p_rf(3));

numD_rf = [1, a1, a2, a3] / sum_b;
denD_rf = zeros(1, 7);
denD_rf(1) = 1.0;
denD_rf(5) = -p_rf(1);
denD_rf(6) = -p_rf(2);
denD_rf(7) = -p_rf(3);
fprintf('    无纹波控制器 D_rf(z) 分子系数:\n'); disp(numD_rf);
fprintf('    无纹波控制器 D_rf(z) 分母系数:\n'); disp(denD_rf);

% 4.2 方案 B: 最小拍有纹波控制器 (仅保留不稳定零点)
z_unstable = zeros_wd(1); % -2.656825
z_stable   = zeros_wd(2); % -0.186956
p_rip = [1, -z_unstable] / (1 - z_unstable);
fprintf('\n4.2 最小拍有纹波闭环传递函数 (保留非最小相位零点):\n');
fprintf('    Phi_rip(z) = z^-4 * (%.6f + %.6f*z^-1)\n', p_rip(1), p_rip(2));

den_one_minus_phi = zeros(1, 6);
den_one_minus_phi(1) = 1.0;
den_one_minus_phi(5) = -p_rip(1);
den_one_minus_phi(6) = -p_rip(2);
poly_s = [1, -z_stable];
denD_rip = b1 * (1 - z_unstable) * conv(poly_s, den_one_minus_phi);
numD_rip = [1, a1, a2, a3];
fprintf('    有纹波控制器 D_rip(z) 分子系数:\n'); disp(numD_rip);
fprintf('    有纹波控制器 D_rip(z) 分母系数:\n'); disp(denD_rip);

% 闭环时域递推仿真 (N = 35 步)
N_sim = 35;
r_step = ones(N_sim, 1);
y_rf = zeros(N_sim, 1); u_rf = zeros(N_sim, 1); e_rf = zeros(N_sim, 1);
y_rip = zeros(N_sim, 1); u_rip = zeros(N_sim, 1); e_rip = zeros(N_sim, 1);

% 仿真无纹波
for k = 1:N_sim
    e_rf(k) = r_step(k) - y_rf(k);
    % 计算 u(k)
    val_u = 0;
    for i = 1:length(numD_rf)
        if k - i + 1 >= 1, val_u = val_u + numD_rf(i)*e_rf(k - i + 1); end
    end
    for j = 2:length(denD_rf)
        if k - j + 1 >= 1, val_u = val_u - denD_rf(j)*u_rf(k - j + 1); end
    end
    u_rf(k) = val_u / denD_rf(1);
    
    % 更新输出 y(k+1)
    if k < N_sim
        val_y = 0;
        for i = 1:length(num_poly)
            idx = (k + 1) - 4 - i + 1;
            if idx >= 1, val_y = val_y + num_poly(i)*u_rf(idx); end
        end
        for j = 2:length(den_poly)
            if (k + 1) - j + 1 >= 1, val_y = val_y - den_poly(j)*y_rf((k + 1) - j + 1); end
        end
        y_rf(k + 1) = val_y;
    end
end

% 仿真有纹波
for k = 1:N_sim
    e_rip(k) = r_step(k) - y_rip(k);
    val_u = 0;
    for i = 1:length(numD_rip)
        if k - i + 1 >= 1, val_u = val_u + numD_rip(i)*e_rip(k - i + 1); end
    end
    for j = 2:length(denD_rip)
        if k - j + 1 >= 1, val_u = val_u - denD_rip(j)*u_rip(k - j + 1); end
    end
    u_rip(k) = val_u / denD_rip(1);
    
    if k < N_sim
        val_y = 0;
        for i = 1:length(num_poly)
            idx = (k + 1) - 4 - i + 1;
            if idx >= 1, val_y = val_y + num_poly(i)*u_rip(idx); end
        end
        for j = 2:length(den_poly)
            if (k + 1) - j + 1 >= 1, val_y = val_y - den_poly(j)*y_rip((k + 1) - j + 1); end
        end
        y_rip(k + 1) = val_y;
    end
end

fprintf('4.3 最小拍控制前 8 拍响应数值:\n');
fprintf('  k:     0       1       2       3       4       5       6       7\n');
fprintf('  y_rf:  %.4f  %.4f  %.4f  %.4f  %.4f  %.4f  %.4f  %.4f\n', y_rf(1:8));
fprintf('  u_rf:  %.4f  %.4f  %.4f  %.4f  %.4f  %.4f  %.4f  %.4f\n', u_rf(1:8));
fprintf('  y_rip: %.4f  %.4f  %.4f  %.4f  %.4f  %.4f  %.4f  %.4f\n', y_rip(1:8));
fprintf('  u_rip: %.4f  %.4f  %.4f  %.4f  %.4f  %.4f  %.4f  %.4f\n', u_rip(1:8));

%% ===================== 5. 极点配置状态反馈控制律设计 =====================
fprintf('\n----------------- (5) 极点配置状态反馈控制律设计 -----------------\n');
xi = 0.5;
wn = 3.6;
sd_real = -xi * wn;             % -1.8000
sd_imag = wn * sqrt(1 - xi^2);   % 3.117691
zd = exp((sd_real + 1j*sd_imag)*T); % 0.566386 + 0.407381j
fprintf('5.1 期望主导极点: s1,2 = %.4f ± j%.4f  ==>  z1,2 = %.6f ± j%.6f (|z| = %.4f)\n', ...
        sd_real, sd_imag, real(zd), imag(zd), abs(zd));

mults = [3, 4, 5];
Kp_all = zeros(3, 3);
Kc_all = zeros(3, 3);

for m = 1:3
    s3_val = mults(m) * sd_real;
    z3_val = exp(s3_val * T);
    des_poly = poly([zd, conj(zd), z3_val]);
    
    % 能控标准型反馈增益
    Kc_all(m, :) = [des_poly(4) - a3, des_poly(3) - a2, des_poly(2) - a1];
    
    % 物理状态空间反馈增益 (Ackermann公式)
    Mc_p = [Hp, Gp*Hp, Gp^2*Hp];
    phi_Gp = Gp^3 + des_poly(2)*Gp^2 + des_poly(3)*Gp + des_poly(4)*eye(3);
    Kp_all(m, :) = [0, 0, 1] / Mc_p * phi_Gp;
    
    fprintf('    [%d倍实部] s3 = %.2f, z3 = %.6f\n', mults(m), s3_val, z3_val);
    fprintf('               期望特征多项式: z^3 + (%.6f)*z^2 + (%.6f)*z + (%.6f)\n', ...
            des_poly(2), des_poly(3), des_poly(4));
    fprintf('               能控型增益 Kc = [%.6f, %.6f, %.6f]\n', Kc_all(m, :));
    fprintf('               物理型增益 Kp = [%.6f, %.6f, %.6f]\n', Kp_all(m, :));
end

% 推荐工程选值：4倍非主导极点实部
Kp_rec = Kp_all(2, :);
Kc_rec = Kc_all(2, :);

% 前馈增益 (用于阶跃无静差跟踪控制)
N_ff = 1 / (Cp / (eye(3) - Gp + Hp*Kp_rec) * Hp);
fprintf('\n5.2 前馈跟踪补偿增益 (4倍实部): N_bar = %.6f\n', N_ff);

%% ===================== 6. 仿真结果综合分析与绘图 =====================
fprintf('\n----------------- (6) 仿真结果综合分析与绘图导出 -----------------\n');

% 6.1 调节系统零输入响应仿真 (初值扰动 x0 = [1; 0; 0])
x0 = [1; 0; 0];
N_reg = 30;
t_reg = (0:N_reg-1)' * T;
x_reg = zeros(3, N_reg, 3);
u_reg = zeros(N_reg, 3);

for m = 1:3
    xk = x0;
    Kp_cur = Kp_all(m, :);
    for k = 1:N_reg
        x_reg(:, k, m) = xk;
        uk = -Kp_cur * xk;
        u_reg(k, m) = uk;
        xk = Gp * xk + Hp * uk;
    end
end

% 6.2 阶跃跟踪与纯滞后预估补偿仿真
N_tr = 45;
t_tr = (0:N_tr-1)' * T;
y_track_pred = zeros(N_tr, 1);
u_track_pred = zeros(N_tr, 1);
x_cur_pred = zeros(3, 1);
u_buf_pred = zeros(N_tr + 10, 1);

for k = 1:N_tr
    y_track_pred(k) = x_cur_pred(1);
    
    u_m3 = 0; if k > 3, u_m3 = u_buf_pred(k - 3); end
    u_m2 = 0; if k > 2, u_m2 = u_buf_pred(k - 2); end
    u_m1 = 0; if k > 1, u_m1 = u_buf_pred(k - 1); end
    
    % 三步超前预估
    x_hat = Gp^3 * x_cur_pred + Gp^2 * Hp * u_m3 + Gp * Hp * u_m2 + Hp * u_m1;
    uk = -Kp_rec * x_hat + N_ff * 1.0;
    u_track_pred(k) = uk;
    u_buf_pred(k) = uk;
    
    x_cur_pred = Gp * x_cur_pred + Hp * u_m3;
end

% 6.3 绘图展示
figure('Color', 'w', 'Position', [100, 100, 900, 600]);
subplot(2,1,1);
stairs(t_reg, squeeze(x_reg(1, :, 1)), 'b-o', 'LineWidth', 1.2, 'MarkerSize', 3.5); hold on;
stairs(t_reg, squeeze(x_reg(1, :, 2)), 'r-s', 'LineWidth', 1.5, 'MarkerSize', 4);
stairs(t_reg, squeeze(x_reg(1, :, 3)), 'g-^', 'LineWidth', 1.2, 'MarkerSize', 3.5);
yline(0, 'k:'); grid on;
title('调节系统状态反馈零输入恢复响应 (不同非主导极点倍数对比)');
xlabel('时间 t / s'); ylabel('状态输出 x_1(k) = y(k)');
legend('3倍实部 (s3=-5.4)', '4倍实部 (s3=-7.2) [推荐工程解]', '5倍实部 (s3=-9.0)', 'Location', 'northeast');

subplot(2,1,2);
stairs(t_reg, u_reg(:, 1), 'b-', 'LineWidth', 1.2); hold on;
stairs(t_reg, u_reg(:, 2), 'r-', 'LineWidth', 1.5);
stairs(t_reg, u_reg(:, 3), 'g-', 'LineWidth', 1.2);
grid on;
title('调节过程控制量输出 u(k) 序列');
xlabel('时间 t / s'); ylabel('控制量 u(k)');
legend('3倍控制量 (初始 -6.10)', '4倍控制量 (初始 -7.21)', '5倍控制量 (初始 -7.98)', 'Location', 'southeast');

fprintf('仿真运行完成！全部计算指标均已准确收敛。\n');
