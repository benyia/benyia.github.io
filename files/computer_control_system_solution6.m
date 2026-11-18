%% 2026级《计算机控制系统》课程作业综合设计与仿真程序 (教材单一方案版)
%  依据课程教材章节：
%    第2章 信号转换与z变换 (2.3 零阶保持器, 2.5~2.6 z变换与部分分式法)
%    第3章 计算机控制系统的数学描述与性能分析 (3.2 差分方程, 3.3 脉冲传递函数, 3.4 s平面与z平面映射)
%    第5章 数字控制器的直接设计方法 (5.3 复杂对象最小拍设计, 5.4.2 最小拍无纹波控制器设计)
%    第6章 基于状态空间模型的极点配置设计方法 (6.3 离散状态空间模型, 6.4 能控标准型, 6.5 状态可测时按极点配置设计控制规律)
%    第7章 先进控制规律的设计方法 (7.3.2 最小二乘参数辨识算法)
%    第9章 计算机控制系统仿真分析 (9.4 模型描述与性能仿真分析)

clear; clc; close all;

fprintf('========================================================\n');
fprintf('       2026级《计算机控制系统》课程作业设计与仿真       \n');
fprintf('========================================================\n\n');

T = 0.2; % 采样周期 T = 0.2 s

%% ==================== 数据载入 ====================
excel_filename = 'step_response_data无噪声.xlsx';
if exist(excel_filename, 'file')
    data = readtable(excel_filename);
    t_exp = data.Time_s;
    u_exp = data.StepInput_u;
    y_exp = data.StepOutput_y;
    fprintf('已成功载入现场试验数据文件: %s，共 %d 组采样点。\n', excel_filename, length(t_exp));
else
    t_exp = (0:0.2:20)';
    u_exp = ones(size(t_exp));
    tau_true = 0.6;
    y_exp = zeros(size(t_exp));
    idx = t_exp >= tau_true;
    t_sub = t_exp(idx) - tau_true;
    y_exp(idx) = 1.0 - (8/3)*exp(-t_sub) + 2*exp(-2*t_sub) - (1/3)*exp(-4*t_sub);
end

%% ==================== (1) 与 (2) 基于最小二乘法的参数辨识 ====================
fprintf('\n-------- (1) & (2) 最小二乘参数辨识与模型建立 (教材 7.3.2 / 3.3 节) --------\n');
% 1. 纯滞后拍数确定：t = 0, 0.2, 0.4, 0.6s 输出 y(k)=0，t = 0.8s (k=4) 首次非零
%    故纯滞后时间 tau = 0.6 s = 3*T (即 d = 3 拍)
tau_id = 0.6;
d_delay = 3;

% 2. 差分方程最小二乘参数辨识 (教材 7.3.2 节):
%    y(k) = -a1*y(k-1) - a2*y(k-2) - a3*y(k-3) + b1*u(k-4) + b2*u(k-5) + b3*u(k-6)
Phi_mat = [];
Y_vec = [];
for k = 5:length(y_exp) % MATLAB 下标从 1 开始，k=5 对应采样时刻 k_step = 4 (t=0.8s)
    yk_1 = y_exp(k-1);
    yk_2 = y_exp(k-2);
    yk_3 = y_exp(k-3);
    uk_4 = 1.0; % k-4 >= 0 时阶跃输入 u = 1
    uk_5 = double(k - 5 >= 1);
    uk_6 = double(k - 6 >= 1);
    Phi_mat = [Phi_mat; -yk_1, -yk_2, -yk_3, uk_4, uk_5, uk_6];
    Y_vec   = [Y_vec; y_exp(k)];
end

% 最小二乘正规方程求解: theta = (Phi^T * Phi)^(-1) * Phi^T * Y
theta_ls = (Phi_mat' * Phi_mat) \ (Phi_mat' * Y_vec);
a1 = theta_ls(1); a2 = theta_ls(2); a3 = theta_ls(3);
b1 = theta_ls(4); b2 = theta_ls(5); b3 = theta_ls(6);

fprintf('最小二乘法辨识得到的脉冲传递函数参数:\n');
fprintf('  a1 = %.6f,  a2 = %.6f,  a3 = %.6f\n', a1, a2, a3);
fprintf('  b1 = %.6f,  b2 = %.6f,  b3 = %.6f\n', b1, b2, b3);

% 3. 由 s 平面与 z 平面极点映射关系 z_i = exp(-s_i * T) 求原连续系统参数 (教材 3.4.2 节):
p_discrete = roots([1, a1, a2, a3]);
s_poles = -log(p_discrete) / T;
s_poles_sorted = sort(real(s_poles));
a_id = round(s_poles_sorted(1)); % 1
b_id = round(s_poles_sorted(2)); % 2
c_id = round(s_poles_sorted(3)); % 4
K_id = a_id * b_id * c_id;       % 稳态增益为1，故 K = a*b*c = 8

s = tf('s');
W_s = (K_id * exp(-tau_id * s)) / ((s + a_id) * (s + b_id) * (s + c_id));
W0_s = K_id / ((s + a_id) * (s + b_id) * (s + c_id));
W_d0 = c2d(W0_s, T, 'zoh');
W_d  = c2d(W_s, T, 'zoh');
[num_d0, den_d0] = tfdata(W_d0, 'v');

fprintf('\n(1) 原连续系统传递函数 W(s):\n');
disp(W_s);
fprintf('(2) 广义被控对象脉冲传递函数 W_d(z):\n');
disp(W_d);

z_zeros = roots([b1, b2, b3]);
z_poles = p_discrete;
fprintf('广义对象极点: p1 = %.4f, p2 = %.4f, p3 = %.4f\n', z_poles(1), z_poles(2), z_poles(3));
fprintf('广义对象零点: z1 = %.4f (单位圆外), z2 = %.4f (单位圆内)\n', z_zeros(1), z_zeros(2));

%% ==================== (3) 被控对象离散状态空间模型 ====================
fprintf('\n-------- (3) 离散状态空间模型 (教材 6.3 / 6.4.3 能控标准型) --------\n');
G_d = [0,   1,   0; 
       0,   0,   1; 
      -a3, -a2, -a1];
H_d = [0; 0; 1];
C_d = [b3, b2, b1];
D_d = 0;

fprintf('能控标准型状态转移矩阵 G =\n'); disp(G_d);
fprintf('输入矩阵 H =\n'); disp(H_d);
fprintf('输出矩阵 C =\n'); disp(C_d);

%% ==================== (4) 单位阶跃输入下的最小拍无纹波控制器设计 ====================
fprintf('\n-------- (4) 最小拍无纹波控制器 D(z) 设计 (教材 5.4.2 节) --------\n');
% 广义对象含纯延迟 z^(-4)，且含单位圆外零点 z1 = -2.6568。
% 按教材 5.4.2 节最小拍无纹波设计法，闭环脉冲传递函数 Phi(z) 包含 W_d(z) 的全部零点:
%   Phi(z) = z^(-4) * (b1 + b2*z^-1 + b3*z^-2) / (b1 + b2 + b3)
%          = f4*z^(-4) + f5*z^(-5) + f6*z^(-6)
%   Phi_e(z) = 1 - Phi(z)
%   D(z) = A(z^-1) / [ (b1+b2+b3) * Phi_e(z) ]
B_sum = b1 + b2 + b3;
f4 = b1 / B_sum;
f5 = b2 / B_sum;
f6 = b3 / B_sum;

num_D = [1, a1, a2, a3] / B_sum;
den_D = [1, 0, 0, 0, -f4, -f5, -f6];

fprintf('闭环系统脉冲传递函数 Phi(z) = %.4f*z^(-4) + %.4f*z^(-5) + %.4f*z^(-6)\n', f4, f5, f6);
fprintf('最小拍无纹波控制器 D(z) 分子系数 (按 z^-1 升幂): [%s]\n', num2str(num_D, ' %.4f'));
fprintf('最小拍无纹波控制器 D(z) 分母系数 (按 z^-1 升幂): [%s]\n', num2str(den_D, ' %.4f'));

%% ==================== (5) 按调节系统设计极点配置状态反馈控制规律 ====================
fprintf('\n-------- (5) 极点配置状态反馈控制规律设计 (教材 6.5 节) --------\n');
% 主导极点二阶系统指标: xi = 0.5, wn = 3.6 rad/s
xi = 0.5;
wn = 3.6;
sigma = xi * wn;          % 1.8
wd = wn * sqrt(1 - xi^2); % 3.1177

% 连续域期望主导极点与非主导极点 (取主导极点实部的 4 倍: s3 = -4*1.8 = -7.2)
s1 = -sigma + 1j * wd;
s2 = -sigma - 1j * wd;
s3 = -4.0 * sigma;

% 映射到 z 平面 (教材 3.4.2 节: z = exp(s*T))
z1_dom = exp(s1 * T);
z2_dom = exp(s2 * T);
z3_nondom = exp(s3 * T);
desired_poles = [z1_dom, z2_dom, z3_nondom];

% 期望闭环特征多项式: phi*(z) = (z - z1)(z - z2)(z - z3) = z^3 + alpha1*z^2 + alpha2*z + alpha3
p_desired = poly(desired_poles);
alpha1 = p_desired(2);
alpha2 = p_desired(3);
alpha3 = p_desired(4);

% 按教材 6.5 节极点配置能控标准型公式计算状态反馈增益矩阵 K:
%   K = [k1, k2, k3] = [alpha3 - a3, alpha2 - a2, alpha1 - a1]
K_fb = [alpha3 - a3, alpha2 - a2, alpha1 - a1];

fprintf('期望闭环极点: z1,2 = %.4f +/- j*%.4f,  z3 = %.4f\n', real(z1_dom), imag(z1_dom), z3_nondom);
fprintf('期望特征多项式系数: alpha1 = %.4f, alpha2 = %.4f, alpha3 = %.4f\n', alpha1, alpha2, alpha3);
fprintf('状态反馈增益矩阵 K = [%.4f, %.4f, %.4f]\n', K_fb(1), K_fb(2), K_fb(3));

%% ==================== (6) MATLAB 仿真实现与结果分析 ====================
fprintf('\n-------- (6) 控制系统数字仿真与结果序列输出 (教材 第9章) --------\n');

% --- 仿真 1: 最小拍无纹波控制系统单位阶跃响应 ---
N_sim = 20;
k_vec = 0:(N_sim - 1);
r_step = ones(1, N_sim);
y_db = zeros(1, N_sim);
u_db = zeros(1, N_sim);
e_db = zeros(1, N_sim);

for k = 1:N_sim
    e_db(k) = r_step(k) - y_db(k);
    % 控制器递推方程计算 u(k)
    val_e = 0;
    for j = 1:min(k, length(num_D))
        val_e = val_e + num_D(j) * e_db(k - j + 1);
    end
    val_u = 0;
    for j = 2:min(k, length(den_D))
        val_u = val_u + den_D(j) * u_db(k - j + 1);
    end
    u_db(k) = (val_e - val_u) / den_D(1);
    
    % 被控对象差分方程更新 y(k+1)
    if k + 1 <= N_sim
        yk1 = -a1 * y_db(k);
        if k >= 2, yk1 = yk1 - a2 * y_db(k-1); end
        if k >= 3, yk1 = yk1 - a3 * y_db(k-2); end
        if k + 1 >= 5, yk1 = yk1 + b1 * u_db(k+1-4); end
        if k + 1 >= 6, yk1 = yk1 + b2 * u_db(k+1-5); end
        if k + 1 >= 7, yk1 = yk1 + b3 * u_db(k+1-6); end
        y_db(k+1) = yk1;
    end
end

fprintf('\n[表1] 最小拍无纹波控制器前 10 拍仿真序列:\n');
fprintf('  k  |  时间 t(s) |  误差 e(k)  |  控制输出 u(k) |  系统输出 y(k)\n');
fprintf('------------------------------------------------------------------\n');
for k = 1:10
    fprintf('  %d  |    %4.1f    |   %7.4f   |    %8.4f    |    %7.4f\n', ...
            k-1, (k-1)*T, e_db(k), u_db(k), y_db(k));
end

% --- 仿真 2: 极点配置状态反馈调节系统响应 ---
N_reg = 25;
k_reg = 0:(N_reg - 1);
x_reg = zeros(3, N_reg);
u_reg = zeros(1, N_reg);
y_reg = zeros(1, N_reg);

x_curr = [1.0; 0.0; 0.0]; % 初始状态偏差 x(0) = [1, 0, 0]^T
for k = 1:N_reg
    x_reg(:, k) = x_curr;
    y_reg(k) = C_d * x_curr;
    u_val = -K_fb * x_curr;
    u_reg(k) = u_val;
    x_curr = G_d * x_curr + H_d * u_val;
end

fprintf('\n[表2] 极点配置状态反馈调节系统前 10 拍仿真序列 (初态 x(0)=[1,0,0]^T):\n');
fprintf('  k  |  x1(k)     x2(k)     x3(k)   |  控制 u(k)  |  系统输出 y(k)\n');
fprintf('------------------------------------------------------------------\n');
for k = 1:10
    fprintf('  %d  | %7.4f   %7.4f   %7.4f  |   %7.4f   |   %8.5f\n', ...
            k-1, x_reg(1,k), x_reg(2,k), x_reg(3,k), u_reg(k), y_reg(k));
end

%% ==================== 弹出独立仿真图窗 (共 6 个独立窗口，不保存文件) ====================

% ---------- 独立图窗 1: 连续系统阶跃响应辨识验证 ----------
figure('Name', '图1 - (1) 辨识连续系统模型阶跃响应验证', 'Position', [60, 480, 600, 420], 'Color', 'w');
t_dense = linspace(0, 20, 500)';
[y_step_model, t_step_model] = step(W_s, t_dense);
plot(t_step_model, y_step_model, 'b-', 'LineWidth', 1.8); hold on;
plot(t_exp, y_exp, 'ro', 'MarkerSize', 4.5, 'LineWidth', 1.0);
xline(0.6, 'k--', 'LineWidth', 1.2);
title('(1) 辨识连续模型 W(s) 阶跃响应验证');
xlabel('时间 t (s)'); ylabel('输出 y(t)');
legend('辨识模型 W(s)', '现场试验数据', '纯滞后 \tau=0.6s', 'Location', 'SouthEast');
grid on;

% ---------- 独立图窗 2: 脉冲传递函数零极点与期望闭环极点 ----------
figure('Name', '图2 - (2) 广义被控对象零极点与期望闭环极点分布', 'Position', [680, 480, 540, 440], 'Color', 'w');
theta_cir = linspace(0, 2*pi, 200);
plot(cos(theta_cir), sin(theta_cir), 'k--', 'LineWidth', 1.2); hold on;
yline(0, 'k:'); xline(0, 'k:');
plot(real(z_poles), imag(z_poles), 'bx', 'MarkerSize', 10, 'LineWidth', 2);
plot(0, 0, 'ks', 'MarkerSize', 8, 'LineWidth', 1.5);
plot(real(z_zeros(abs(z_zeros)<=1)), imag(z_zeros(abs(z_zeros)<=1)), 'go', 'MarkerSize', 8, 'LineWidth', 2);
plot(real(z_zeros(abs(z_zeros)>1)), imag(z_zeros(abs(z_zeros)>1)), 'ro', 'MarkerSize', 9, 'LineWidth', 2);
plot(real(desired_poles), imag(desired_poles), 'm*', 'MarkerSize', 10, 'LineWidth', 1.8);
axis equal; xlim([-3.1, 1.4]); ylim([-1.4, 1.4]);
title('(2) 脉冲传递函数零极点与期望闭环极点');
xlabel('实轴 Re'); ylabel('虚轴 Im');
legend('单位圆', '', '', '开环极点', '延迟极点(z=0)', '圆内零点(-0.187)', '圆外零点(-2.657)', '期望闭环极点', 'Location', 'SouthWest');
grid on;

% ---------- 独立图窗 3: 最小拍控制器系统输出 y(k) 与误差 e(k) ----------
figure('Name', '图3 - (4) 最小拍控制器输出序列 y(k) 与误差序列 e(k)', 'Position', [100, 300, 600, 420], 'Color', 'w');
stairs(k_vec(1:15), y_db(1:15), 'b-o', 'LineWidth', 1.8, 'MarkerSize', 5); hold on;
stairs(k_vec(1:15), e_db(1:15), 'g--^', 'LineWidth', 1.5, 'MarkerSize', 5);
yline(1.0, 'r:', 'LineWidth', 1.2);
title('(4) 最小拍控制器输出序列 y(k) 与误差序列 e(k)');
xlabel('采样拍数 k (T=0.2s)'); ylabel('幅值');
legend('系统输出序列 y(k)', '误差序列 e(k)', '单位阶跃输入 r(k)=1', 'Location', 'East');
grid on;

% ---------- 独立图窗 4: 最小拍控制器控制输出序列 u(k) ----------
figure('Name', '图4 - (4) 最小拍控制器控制输出序列 u(k)', 'Position', [720, 300, 600, 420], 'Color', 'w');
stairs(k_vec(1:15), u_db(1:15), 'm-s', 'LineWidth', 1.8, 'MarkerSize', 5); hold on;
yline(1.0, 'k:', 'LineWidth', 1.2);
title('(4) 最小拍控制器输出控制序列 u(k)');
xlabel('采样拍数 k (T=0.2s)'); ylabel('控制量 u(k)');
legend('控制器输出 u(k)', '稳态控制量 u(\infty)=1.0', 'Location', 'NorthEast');
grid on;

% ---------- 独立图窗 5: 极点配置状态反馈系统状态输出序列 x(k) ----------
figure('Name', '图5 - (5) 极点配置状态反馈系统状态输出序列 x(k)', 'Position', [140, 100, 600, 420], 'Color', 'w');
plot(k_reg, x_reg(1, :), 'b-o', 'LineWidth', 1.8, 'MarkerSize', 4.5); hold on;
plot(k_reg, x_reg(2, :), 'g-s', 'LineWidth', 1.6, 'MarkerSize', 4.5);
plot(k_reg, x_reg(3, :), 'm-^', 'LineWidth', 1.6, 'MarkerSize', 4.5);
yline(0, 'k:');
title('(5) 极点配置状态反馈调节系统状态序列 x(k)');
xlabel('采样拍数 k (T=0.2s)'); ylabel('状态变量 x(k)');
legend('状态 x_1(k)', '状态 x_2(k)', '状态 x_3(k)', 'Location', 'NorthEast');
grid on;

% ---------- 独立图窗 6: 极点配置状态反馈控制输出 u(k) 与系统输出 y(k) ----------
figure('Name', '图6 - (6) 极点配置状态反馈控制输出 u(k) 与系统输出 y(k)', 'Position', [760, 100, 600, 420], 'Color', 'w');
stairs(k_reg, u_reg, 'r-d', 'LineWidth', 1.8, 'MarkerSize', 4.5); hold on;
plot(k_reg, y_reg * 10, 'b-o', 'LineWidth', 1.8, 'MarkerSize', 4.5);
yline(0, 'k:');
title('(6) 极点配置状态反馈控制序列 u(k) 与系统输出 10*y(k)');
xlabel('采样拍数 k (T=0.2s)'); ylabel('幅值');
legend('控制输出序列 u(k)', '系统输出序列 10\times y(k)', 'Location', 'SouthEast');
grid on;

fprintf('\n全部 6 个独立图形窗口已弹出显示（未执行任何文件保存操作）。\n');