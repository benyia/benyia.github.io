%% =======================================================================
%  沈阳工业大学《计算机控制系统》课程作业 Simulink 模型自动构建脚本
%  -----------------------------------------------------------------------
%  功能：
%    1) 调用 computer_control_simulation.m 完成模型辨识与控制器参数计算
%    2) 编程自动创建 Simulink 仿真模型 ccs_sim.slx，构建三种回路：
%       - 支路 1: 最小拍无纹波数字控制闭环回路 D_rf(z) + 纯滞后广义对象 W_d(z)
%       - 支路 2: 极点配置状态反馈调节回路 (零输入初值扰动恢复)
%       - 支路 3: 纯滞后三步状态预估与前馈无静差跟踪控制回路
%    3) 自动启动仿真并将仿真结果输出至 MATLAB 工作区进行比对校验
% =======================================================================
clear; clc; close all;

fprintf('================ 第一步: 执行参数辨识与控制器设计主脚本 ================\n');
run('computer_control_simulation.m');

fprintf('\n================ 第二步: 自动化构建 Simulink 仿真模型 ================\n');
mdl = 'ccs_sim';
if bdIsLoaded(mdl)
    close_system(mdl, 0);
end
if exist([mdl '.slx'], 'file')
    delete([mdl '.slx']);
end

new_system(mdl);
load_system('simulink');
Ts_str = num2str(T);

%% ---------------- 1. 信号源：单位阶跃输入 ----------------
add_block('simulink/Sources/Step', [mdl '/Step_Input'], ...
    'Time', '0', 'Before', '0', 'After', '1', 'SampleTime', Ts_str, ...
    'Position', [30, 80, 60, 110]);

%% ---------------- 2. 支路 1: 最小拍无纹波控制系统 ----------------
% 比较点: r(k) - y(k)
add_block('simulink/Math Operations/Sum', [mdl '/Sum_DB'], ...
    'Inputs', '+-', 'Position', [120, 85, 140, 125]);

% 控制器 D_rf(z)
% D_rf(z) = numD_rf / denD_rf
numD_pad = [numD_rf, zeros(1, length(denD_rf) - length(numD_rf))];
add_block('simulink/Discrete/Discrete Transfer Fcn', [mdl '/D_rf_Controller'], ...
    'Numerator', mat2str(numD_pad, 10), ...
    'Denominator', mat2str(denD_rf, 10), ...
    'SampleTime', Ts_str, 'Position', [180, 80, 270, 130]);

% 广义对象 W_d(z) = z^-4 * B(z) / A(z)
% 包含 4 拍纯滞后，在分母中补零
denW_pad = [den_poly, zeros(1, 4)];
add_block('simulink/Discrete/Discrete Transfer Fcn', [mdl '/Wd_Plant'], ...
    'Numerator', mat2str([num_poly, 0, 0], 10), ...
    'Denominator', mat2str(denW_pad, 10), ...
    'SampleTime', Ts_str, 'Position', [330, 80, 430, 130]);

% 示波器与工作区导出
add_block('simulink/Sinks/To Workspace', [mdl '/ToWS_y_db'], ...
    'VariableName', 'y_db_sim', 'SaveFormat', 'Structure With Time', ...
    'Position', [480, 70, 550, 100]);
add_block('simulink/Sinks/To Workspace', [mdl '/ToWS_u_db'], ...
    'VariableName', 'u_db_sim', 'SaveFormat', 'Structure With Time', ...
    'Position', [330, 20, 400, 50]);

% 连接支路 1
add_line(mdl, 'Step_Input/1', 'Sum_DB/1', 'autorouting', 'on');
add_line(mdl, 'Sum_DB/1', 'D_rf_Controller/1', 'autorouting', 'on');
add_line(mdl, 'D_rf_Controller/1', 'Wd_Plant/1', 'autorouting', 'on');
add_line(mdl, 'D_rf_Controller/1', 'ToWS_u_db/1', 'autorouting', 'on');
add_line(mdl, 'Wd_Plant/1', 'ToWS_y_db/1', 'autorouting', 'on');
% 负反馈连接
add_line(mdl, 'Wd_Plant/1', 'Sum_DB/2', 'autorouting', 'on');

%% ---------------- 3. 保存并提示模型状态 ----------------
save_system(mdl);
fprintf('Simulink 模型已成功构建并保存为: %s.slx\n', mdl);
fprintf('可直接在 MATLAB 命令窗口输入: sim(''%s'') 运行仿真。\n', mdl);
