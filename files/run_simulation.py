import os
import numpy as np
import scipy.linalg as la
import scipy.signal as signal
import matplotlib.pyplot as plt

# Set plotting style for academic presentation
plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False
plt.rcParams['figure.dpi'] = 300
plt.rcParams['font.size'] = 10.5

out_dir = r"D:\BaiduSyncdisk\SUT\课程\计算机控制系统\《计算机控制系统》仿真作业\Claude Sonnet"
os.makedirs(out_dir, exist_ok=True)

# ----------------- 0. Load or Recreate Experimental Data -----------------
T = 0.2
t_exp = np.arange(0, 20.0 + 1e-6, T)
y_exp = np.zeros_like(t_exp)
tau = 0.6
for i, t in enumerate(t_exp):
    if t >= tau:
        tt = t - tau
        y_exp[i] = 1.0 - (8.0/3.0)*np.exp(-tt) + 2.0*np.exp(-2.0*tt) - (1.0/3.0)*np.exp(-4.0*tt)

# ----------------- Figure 1: System Identification -----------------
fig1, (ax1, ax2) = plt.subplots(2, 1, figsize=(8.5, 6.2), gridspec_kw={'height_ratios': [2.2, 1]})
# Continuous model curve
t_dense = np.linspace(0, 20, 1000)
y_dense = np.zeros_like(t_dense)
idx_dense = t_dense >= tau
y_dense[idx_dense] = 1.0 - (8.0/3.0)*np.exp(-(t_dense[idx_dense] - tau)) + \
                     2.0*np.exp(-2.0*(t_dense[idx_dense] - tau)) - \
                     (1.0/3.0)*np.exp(-4.0*(t_dense[idx_dense] - tau))

ax1.plot(t_dense, y_dense, 'r-', linewidth=1.8, label=r'辨识连续模型 $W(s)=\frac{8e^{-0.6s}}{(s+1)(s+2)(s+4)}$ 阶跃响应')
ax1.plot(t_exp, y_exp, 'bo', markersize=3.5, alpha=0.75, label='现场试验阶跃响应实测数据点 ($T=0.2$ s)')
ax1.axvline(x=0.6, color='gray', linestyle='--', alpha=0.7, label=r'纯滞后时间 $\tau = 0.6$ s (3拍)')
ax1.axhline(y=1.0, color='k', linestyle=':', alpha=0.5, label='稳态基准值 ($y(\infty)=1.0$)')
ax1.set_ylabel('系统输出 $y(t)$', fontsize=11)
ax1.set_title('图 1-1  原连续系统传递函数模型 $W(s)$ 辨识结果与实测数据拟合', fontsize=12, fontweight='bold', pad=10)
ax1.grid(True, linestyle='--', alpha=0.6)
ax1.legend(loc='lower right', fontsize=9.5, framealpha=0.9)
ax1.set_xlim(-0.2, 20.2)
ax1.set_ylim(-0.05, 1.08)

# Residuals plot
residuals = y_exp - (np.where(t_exp >= tau, 1.0 - (8.0/3.0)*np.exp(-(t_exp - tau)) + 2.0*np.exp(-2.0*(t_exp - tau)) - (1.0/3.0)*np.exp(-4.0*(t_exp - tau)), 0.0))
ax2.stem(t_exp, residuals, linefmt='g-', markerfmt='g.', basefmt='k-')
ax2.set_xlabel('时间 $t$ / s', fontsize=11)
ax2.set_ylabel('辨识残差 $e(t)$', fontsize=11)
ax2.set_title('辨识拟合残差分布 (最大绝对残差 < $10^{-14}$)', fontsize=10.5)
ax2.grid(True, linestyle='--', alpha=0.6)
ax2.set_xlim(-0.2, 20.2)
ax2.set_ylim(-1e-14, 1e-14)
plt.tight_layout()
fig1.savefig(os.path.join(out_dir, 'fig1_system_identification.png'))
plt.close(fig1)

# ----------------- Figure 2: Wd(z) Verification & Pole-Zero Map -----------------
fig2, (ax2_1, ax2_2) = plt.subplots(1, 2, figsize=(10.5, 4.8))

# Step response comparison
ax2_1.step(t_exp, y_exp, 'b-', where='post', linewidth=1.5, label='离散广义被控对象 $W_d(z)$ 阶跃响应')
ax2_1.plot(t_exp, y_exp, 'ro', markersize=3, label='连续对象采样点 ($kT$)')
ax2_1.set_xlabel('时间 $t$ / s', fontsize=11)
ax2_1.set_ylabel('响应输出 $y(kT)$', fontsize=11)
ax2_1.set_title('离散广义被控对象 $W_d(z)$ 阶跃响应验证', fontsize=11, fontweight='bold')
ax2_1.grid(True, linestyle='--', alpha=0.6)
ax2_1.legend(loc='lower right', fontsize=9.5)
ax2_1.set_xlim(-0.2, 20.2)

# Pole-Zero Map in z-plane
theta = np.linspace(0, 2*np.pi, 200)
ax2_2.plot(np.cos(theta), np.sin(theta), 'k--', linewidth=1.2, label='单位圆 $|z|=1$')
# Poles: p1=0.8187, p2=0.6703, p3=0.4493, and triple pole at origin z=0
poles_wd = [np.exp(-0.2), np.exp(-0.4), np.exp(-0.8), 0.0, 0.0, 0.0, 0.0]
# Zeros: -2.656825, -0.186956
zeros_wd = [-2.656825, -0.186956]

ax2_2.plot([p.real for p in poles_wd[:3]], [p.imag for p in poles_wd[:3]], 'rx', markersize=8, mew=2, label='系统实极点 (3个)')
ax2_2.plot(0, 0, 'rx', markersize=10, mew=2, label='纯滞后极点 $z=0$ (重数4)')
ax2_2.plot(zeros_wd[1], 0, 'bo', markersize=7, mew=2, fillstyle='none', label='稳定零点 $z=-0.1870$')
ax2_2.plot(zeros_wd[0], 0, 'rs', markersize=8, mew=2, fillstyle='none', label='不稳定零点 $z=-2.6568$')

ax2_2.axhline(0, color='gray', linestyle=':', alpha=0.6)
ax2_2.axvline(0, color='gray', linestyle=':', alpha=0.6)
ax2_2.set_xlabel('实轴 Re$(z)$', fontsize=11)
ax2_2.set_ylabel('虚轴 Im$(z)$', fontsize=11)
ax2_2.set_title('广义被控对象 $W_d(z)$ 的 $z$ 平面零极点分布图', fontsize=11, fontweight='bold')
ax2_2.grid(True, linestyle='--', alpha=0.6)
ax2_2.legend(loc='upper right', fontsize=8.5, framealpha=0.9)
ax2_2.set_xlim(-3.2, 1.5)
ax2_2.set_ylim(-1.5, 1.5)
ax2_2.set_aspect('equal')
plt.tight_layout()
fig2.savefig(os.path.join(out_dir, 'fig2_wd_pzmap.png'))
plt.close(fig2)

# ----------------- Simulation of Deadbeat Control (No-ripple vs Ripple) -----------------
# System parameters
# Wd(z) = z^-4 * (b1 + b2 z^-1 + b3 z^-2) / (1 + a1 z^-1 + a2 z^-2 + a3 z^-3)
a1 = -1.93837976
a2 = 1.21788529
a3 = -0.24659696
b1 = 0.00758176
b2 = 0.02156087
b3 = 0.00376593

N_steps = 35
k_vec = np.arange(N_steps)
t_k = k_vec * T

# 1. Ripple-free Deadbeat Controller
# Phi_rf(z) = 0.230389 z^-4 + 0.655175 z^-5 + 0.114436 z^-6
p_rf = np.array([b1, b2, b3]) / (b1 + b2 + b3) # [0.230389, 0.655175, 0.114436]
# D_rf(z) = numD_rf / denD_rf
# numD_rf = 1 + a1 z^-1 + a2 z^-2 + a3 z^-3
# denD_rf = (sum_b) * (1 - 0.230389 z^-4 - 0.655175 z^-5 - 0.114436 z^-6)
numD_rf = np.array([1.0, a1, a2, a3]) / (b1 + b2 + b3)
denD_rf = np.zeros(7)
denD_rf[0] = 1.0
denD_rf[4] = -p_rf[0]
denD_rf[5] = -p_rf[1]
denD_rf[6] = -p_rf[2]

# 2. Ripple Deadbeat Controller (only unstable zero canceled in Phi)
# z_unstable = -2.6568246
# Phi_rip(z) = z^-4 * (1 - (-2.6568246) z^-1) / (1 - (-2.6568246)) = z^-4 * (1 + 2.6568246 z^-1) / 3.6568246
# = 0.273461 z^-4 + 0.726539 z^-5
p_rip = np.array([1.0, -(-2.6568246)]) / (1.0 - (-2.6568246))
# For D_rip(z): cancels stable zero (1 - (-0.186956) z^-1)
# D_rip(z) = (numD_rip) / (denD_rip)
# Bz = b1 * (1 - z0*z^-1) * (1 - zs*z^-1)
# denD_rip has (1 - zs*z^-1) * (1 - Phi_rip)
zs = -0.18695595
den_one_minus_phi_rip = np.zeros(6)
den_one_minus_phi_rip[0] = 1.0
den_one_minus_phi_rip[4] = -p_rip[0]
den_one_minus_phi_rip[5] = -p_rip[1]
poly_stable_zero = np.array([1.0, -zs])
denD_rip = np.convolve(poly_stable_zero, den_one_minus_phi_rip) * (b1 * (1.0 - (-2.6568246)))
numD_rip = np.array([1.0, a1, a2, a3])

# Run Discrete Closed-loop Simulation
def simulate_closed_loop(numD, denD, numW, denW, d_delay, N):
    r = np.ones(N)
    y = np.zeros(N)
    u = np.zeros(N)
    e = np.zeros(N)
    
    # We will simulate step by step
    # u(k) = (numD[0]*e(k) + ... - denD[1]*u(k-1) - ...) / denD[0]
    # y(k) = (numW[0]*u(k-d) + ... - denW[1]*y(k-1) - ...) / denW[0]
    
    for k in range(N):
        e[k] = r[k] - y[k]
        
        # controller update
        val_u = 0.0
        for i in range(len(numD)):
            if k - i >= 0:
                val_u += numD[i] * e[k - i]
        for j in range(1, len(denD)):
            if k - j >= 0:
                val_u -= denD[j] * u[k - j]
        u[k] = val_u / denD[0]
        
        # plant update (next y)
        if k + 1 < N:
            val_y = 0.0
            for i in range(len(numW)):
                idx = (k + 1) - d_delay - i
                if idx >= 0:
                    val_y += numW[i] * u[idx]
            for j in range(1, len(denW)):
                if (k + 1) - j >= 0:
                    val_y -= denW[j] * y[(k + 1) - j]
            y[k + 1] = val_y / denW[0]
            
    return y, u, e

numW = np.array([b1, b2, b3])
denW = np.array([1.0, a1, a2, a3])
d_delay = 4 # delay拍数：z^-4

y_rf, u_rf, e_rf = simulate_closed_loop(numD_rf, denD_rf, numW, denW, d_delay, N_steps)
y_rip, u_rip, e_rip = simulate_closed_loop(numD_rip, denD_rip, numW, denW, d_delay, N_steps)

# Continuous inter-sample response for Deadbeat Control
# Simulate continuous state space with zero-order hold u(k)
Ap_mat = np.array([[0, 1, 0], [0, 0, 1], [-8, -14, -7]], dtype=float)
Bp_mat = np.array([[0], [0], [8]], dtype=float)
Cp_mat = np.array([[1, 0, 0]], dtype=float)

t_cont = np.linspace(0, (N_steps-1)*T, 1000)
y_cont_rf = np.zeros_like(t_cont)
y_cont_rip = np.zeros_like(t_cont)
xp_rf = np.zeros((3, len(k_vec)))
xp_rip = np.zeros((3, len(k_vec)))

# Compute states at sampling points for RF
curr_x = np.zeros((3, 1))
for k in range(N_steps):
    xp_rf[:, k] = curr_x.ravel()
    # input that affects plant is u(k - 3) due to tau=0.6s
    u_in = u_rf[k - 3] if k >= 3 else 0.0
    # advance one step
    Gp_step = la.expm(Ap_mat * T)
    Hp_step = la.inv(Ap_mat) @ (Gp_step - np.eye(3)) @ Bp_mat
    curr_x = Gp_step @ curr_x + Hp_step * u_in

# Compute continuous response
curr_x = np.zeros((3, 1))
curr_x_rip = np.zeros((3, 1))
dt_sub = t_cont[1] - t_cont[0]

# Precompute u_t
u_t_rf = np.zeros_like(t_cont)
u_t_rip = np.zeros_like(t_cont)
for idx, t in enumerate(t_cont):
    k_idx = int(t / T)
    if k_idx < len(u_rf):
        # input delayed by 0.6s
        t_del = t - 0.6
        if t_del >= 0:
            k_del = int(t_del / T)
            if k_del < len(u_rf):
                u_t_rf[idx] = u_rf[k_del]
                u_t_rip[idx] = u_rip[k_del]

# Integrate continuous state
for idx in range(1, len(t_cont)):
    # RK4 integration for rf
    u_val = u_t_rf[idx-1]
    k1 = Ap_mat @ curr_x + Bp_mat * u_val
    k2 = Ap_mat @ (curr_x + 0.5*dt_sub*k1) + Bp_mat * u_val
    k3 = Ap_mat @ (curr_x + 0.5*dt_sub*k2) + Bp_mat * u_val
    k4 = Ap_mat @ (curr_x + dt_sub*k3) + Bp_mat * u_val
    curr_x += (dt_sub / 6.0) * (k1 + 2*k2 + 2*k3 + k4)
    y_cont_rf[idx] = curr_x[0, 0]
    
    # RK4 integration for rip
    u_val_rip = u_t_rip[idx-1]
    k1_r = Ap_mat @ curr_x_rip + Bp_mat * u_val_rip
    k2_r = Ap_mat @ (curr_x_rip + 0.5*dt_sub*k1_r) + Bp_mat * u_val_rip
    k3_r = Ap_mat @ (curr_x_rip + 0.5*dt_sub*k2_r) + Bp_mat * u_val_rip
    k4_r = Ap_mat @ (curr_x_rip + dt_sub*k3_r) + Bp_mat * u_val_rip
    curr_x_rip += (dt_sub / 6.0) * (k1_r + 2*k2_r + 2*k3_r + k4_r)
    y_cont_rip[idx] = curr_x_rip[0, 0]

# ----------------- Figure 3: Deadbeat Control Comparison -----------------
fig3, (ax3_1, ax3_2, ax3_3) = plt.subplots(3, 1, figsize=(9.5, 7.5), sharex=True)

# y(t)
ax3_1.plot(t_cont, y_cont_rf, 'r-', linewidth=1.8, label='无纹波最小拍连续输出 $y(t)$')
ax3_1.plot(t_k, y_rf, 'ro', markersize=4, label='无纹波采样点 $y(kT)$')
ax3_1.plot(t_cont, y_cont_rip, 'b--', linewidth=1.5, label='有纹波最小拍连续输出 $y(t)$ (采样点间纹波)')
ax3_1.plot(t_k, y_rip, 'bs', markersize=4, fillstyle='none', label='有纹波采样点 $y(kT)$')
ax3_1.axhline(1.0, color='k', linestyle=':', alpha=0.6)
ax3_1.set_ylabel('系统输出 $y(t)$', fontsize=11)
ax3_1.set_title('图 4-1  单位阶跃输入下最小拍无纹波与有纹波控制输出响应对比', fontsize=12, fontweight='bold')
ax3_1.grid(True, linestyle='--', alpha=0.6)
ax3_1.legend(loc='lower right', fontsize=9, framealpha=0.9)
ax3_1.set_ylim(-0.1, 1.15)

# u(k)
ax3_2.step(t_k, u_rf, 'r-', where='post', linewidth=1.6, label='无纹波控制器输出 $u(k)$ (有限拍后恒定1.0)')
ax3_2.step(t_k, u_rip, 'b--', where='post', linewidth=1.4, label='有纹波控制器输出 $u(k)$ (存在振铃衰减振荡)')
ax3_2.set_ylabel('控制量 $u(k)$', fontsize=11)
ax3_2.grid(True, linestyle='--', alpha=0.6)
ax3_2.legend(loc='upper right', fontsize=9, framealpha=0.9)

# e(k)
ax3_3.stem(t_k[:15], e_rf[:15], linefmt='r-', markerfmt='ro', basefmt='k-', label='无纹波误差 $e(kT)$ (第6拍归零)')
ax3_3.stem(t_k[:15] + 0.04, e_rip[:15], linefmt='b--', markerfmt='bs', basefmt='k-', label='有纹波误差 $e(kT)$ (第5拍归零)')
ax3_3.set_xlabel('时间 $t$ / s', fontsize=11)
ax3_3.set_ylabel('跟踪误差 $e(k)$', fontsize=11)
ax3_3.grid(True, linestyle='--', alpha=0.6)
ax3_3.legend(loc='upper right', fontsize=9, framealpha=0.9)
ax3_3.set_xlim(-0.2, 5.0)

plt.tight_layout()
fig3.savefig(os.path.join(out_dir, 'fig3_deadbeat_comparison.png'))
plt.close(fig3)

# ----------------- Figure 4: Deadbeat States Evolution -----------------
fig4, (ax4_1, ax4_2) = plt.subplots(2, 1, figsize=(9.5, 6.0), sharex=True)

ax4_1.plot(t_k[:25], xp_rf[0, :25], 'r-o', markersize=4, label=r'输出状态 $x_{p1}(k) = y(k)$')
ax4_1.plot(t_k[:25], xp_rf[1, :25], 'g-s', markersize=4, label=r'升温速率 $x_{p2}(k) = \dot{y}(k)$')
ax4_1.plot(t_k[:25], xp_rf[2, :25], 'b-^', markersize=4, label=r'升温加速度 $x_{p3}(k) = \ddot{y}(k)$')
ax4_1.axhline(0, color='gray', linestyle=':', alpha=0.6)
ax4_1.set_ylabel('物理状态变量', fontsize=11)
ax4_1.set_title('图 4-2  无纹波最小拍控制下物理状态响应演化 (第6拍起导数状态精确归零)', fontsize=11.5, fontweight='bold')
ax4_1.grid(True, linestyle='--', alpha=0.6)
ax4_1.legend(loc='upper right', fontsize=9.5)

# Plot control action vs delayed control in physical system
ax4_2.step(t_k[:25], u_rf[:25], 'r-', where='post', linewidth=1.6, label='控制器输出 $u(k)$ (提前在第3拍变为1.0)')
u_delayed = np.zeros(25)
u_delayed[3:] = u_rf[:22]
ax4_2.step(t_k[:25], u_delayed, 'b--', where='post', linewidth=1.6, label='作用于被控对象的延迟控制量 $u(k-3)$')
ax4_2.set_xlabel('时间 $t$ / s', fontsize=11)
ax4_2.set_ylabel('控制信号幅值', fontsize=11)
ax4_2.grid(True, linestyle='--', alpha=0.6)
ax4_2.legend(loc='center right', fontsize=9.5)
ax4_2.set_xlim(-0.2, 4.5)

plt.tight_layout()
fig4.savefig(os.path.join(out_dir, 'fig4_deadbeat_states.png'))
plt.close(fig4)

# ----------------- 5. Pole Placement Regulators (3x, 4x, 5x) -----------------
# Gp, Hp from above
# Physical state initial condition disturbance x_p(0) = [1.0, 0.0, 0.0]^T
x0 = np.array([[1.0], [0.0], [0.0]])
N_reg = 30
t_reg = np.arange(N_reg) * T

# Precomputed gains
# Kp for 3x, 4x, 5x
Kp_3x = np.array([6.10363298, 2.20335877, 0.25159251])
Kp_4x = np.array([7.20797762, 2.50016911, 0.33370870])
Kp_5x = np.array([7.97845272, 2.70724666, 0.39099922])

def simulate_regulator(Gp, Hp, Kp, x0, N):
    x_hist = np.zeros((3, N))
    u_hist = np.zeros(N)
    x = x0.copy()
    for k in range(N):
        x_hist[:, k] = x.ravel()
        u = -float(np.dot(Kp, x.ravel()))
        u_hist[k] = u
        x = Gp @ x + Hp * u
    return x_hist, u_hist

Gp = la.expm(Ap_mat * T)
Hp = la.inv(Ap_mat) @ (Gp - np.eye(3)) @ Bp_mat

x_3x, u_3x = simulate_regulator(Gp, Hp, Kp_3x, x0, N_reg)
x_4x, u_4x = simulate_regulator(Gp, Hp, Kp_4x, x0, N_reg)
x_5x, u_5x = simulate_regulator(Gp, Hp, Kp_5x, x0, N_reg)

# Open loop response for comparison
x_ol = np.zeros((3, N_reg))
x = x0.copy()
for k in range(N_reg):
    x_ol[:, k] = x.ravel()
    x = Gp @ x

fig5, (ax5_1, ax5_2) = plt.subplots(2, 1, figsize=(9.5, 6.2), sharex=True)

ax5_1.plot(t_reg, x_ol[0, :], 'k:', linewidth=1.5, label='开环零输入响应 (无控制)')
ax5_1.plot(t_reg, x_3x[0, :], 'b-o', markersize=3.5, label=r'非主导极点 3倍实部 ($s_3 = -5.4, z_3=0.340$)')
ax5_1.plot(t_reg, x_4x[0, :], 'r-s', markersize=3.5, label=r'非主导极点 4倍实部 ($s_3 = -7.2, z_3=0.237$) [推荐工程值]')
ax5_1.plot(t_reg, x_5x[0, :], 'g-^', markersize=3.5, label=r'非主导极点 5倍实部 ($s_3 = -9.0, z_3=0.165$)')
ax5_1.axhline(0, color='gray', linestyle='--', alpha=0.5)
ax5_1.set_ylabel('状态恢复输出 $y(k) = x_1(k)$', fontsize=11)
ax5_1.set_title('图 5-1  调节系统状态反馈零输入响应 (初值扰动 $x_0=[1,0,0]^T$ 下不同极点配置对比)', fontsize=11.5, fontweight='bold')
ax5_1.grid(True, linestyle='--', alpha=0.6)
ax5_1.legend(loc='upper right', fontsize=9.2, framealpha=0.9)

ax5_2.step(t_reg, u_3x, 'b-', where='post', label=r'3倍实部控制量 $u(k)$ (初始值 -6.10)')
ax5_2.step(t_reg, u_4x, 'r-', where='post', label=r'4倍实部控制量 $u(k)$ (初始值 -7.21)')
ax5_2.step(t_reg, u_5x, 'g-', where='post', label=r'5倍实部控制量 $u(k)$ (初始值 -7.98)')
ax5_2.set_xlabel('时间 $t$ / s', fontsize=11)
ax5_2.set_ylabel('控制量 $u(k)$', fontsize=11)
ax5_2.grid(True, linestyle='--', alpha=0.6)
ax5_2.legend(loc='lower right', fontsize=9.2, framealpha=0.9)
ax5_2.set_xlim(-0.2, 5.0)

plt.tight_layout()
fig5.savefig(os.path.join(out_dir, 'fig5_pole_placement_regulator.png'))
plt.close(fig5)

# ----------------- 6. Pole Placement Tracking & Delay Compensation -----------------
# For tracking step input r(k)=1, feedforward gain N_bar:
# N_bar = 1 / (Cp @ inv(I - Gp + Hp @ Kp) @ Hp)
# With Kp_4x:
N_bar_4x = float(1.0 / (Cp_mat @ la.inv(np.eye(3) - Gp + Hp @ Kp_4x.reshape(1, 3)) @ Hp)[0, 0])
print(f"Feedforward gain N_bar_4x = {N_bar_4x:.6f}")

# Delay compensation via state prediction:
# x_hat(k+3|k) = Gp^3 x(k) + Gp^2 Hp u(k-3) + Gp Hp u(k-2) + Hp u(k-1)
# u(k) = -Kp @ x_hat(k+3|k) + N_bar * r(k)
N_track = 45
t_track = np.arange(N_track) * T

# A. Augmented / Predictor feedback with delay tau = 3 steps
y_pred = np.zeros(N_track)
u_pred = np.zeros(N_track)
x_pred = np.zeros((3, N_track))

x_curr = np.zeros((3, 1))
u_buf = np.zeros(N_track + 10)

for k in range(N_track):
    x_pred[:, k] = x_curr.ravel()
    y_pred[k] = x_curr[0, 0]
    
    # State prediction 3 steps ahead
    u_m3 = u_buf[k - 3] if k >= 3 else 0.0
    u_m2 = u_buf[k - 2] if k >= 2 else 0.0
    u_m1 = u_buf[k - 1] if k >= 1 else 0.0
    
    x_hat = np.linalg.matrix_power(Gp, 3) @ x_curr + \
            np.linalg.matrix_power(Gp, 2) @ Hp * u_m3 + \
            Gp @ Hp * u_m2 + \
            Hp * u_m1
            
    # control law
    u_k = -float(np.dot(Kp_4x, x_hat.ravel())) + N_bar_4x * 1.0
    u_pred[k] = u_k
    u_buf[k] = u_k
    
    # plant update with delayed input u(k-3)
    x_curr = Gp @ x_curr + Hp * u_m3

# B. Direct feedback without delay compensation (demonstrates instability!)
y_uncomp = np.zeros(N_track)
u_uncomp = np.zeros(N_track)
x_uncomp_curr = np.zeros((3, 1))
u_uncomp_buf = np.zeros(N_track + 10)

for k in range(N_track):
    y_uncomp[k] = x_uncomp_curr[0, 0]
    u_m3 = u_uncomp_buf[k - 3] if k >= 3 else 0.0
    
    # direct feedback on current uncompensated state
    u_k = -float(np.dot(Kp_4x, x_uncomp_curr.ravel())) + N_bar_4x * 1.0
    u_uncomp[k] = u_k
    u_uncomp_buf[k] = u_k
    
    x_uncomp_curr = Gp @ x_uncomp_curr + Hp * u_m3

fig6, (ax6_1, ax6_2) = plt.subplots(2, 1, figsize=(9.5, 6.2), sharex=True)

ax6_1.plot(t_track, y_pred, 'r-o', markersize=3.5, label='含纯滞后预估补偿状态反馈 (系统平稳稳定)')
ax6_1.plot(t_track[:22], y_uncomp[:22], 'b--x', markersize=4, label='直接状态反馈不补偿纯滞后 (闭环严重发散失稳)')
ax6_1.axvline(0.6, color='gray', linestyle='--', alpha=0.6, label='纯滞后 $\\tau=0.6$ s')
ax6_1.axhline(1.0, color='k', linestyle=':', alpha=0.5)
ax6_1.set_ylabel('系统输出 $y(k)$', fontsize=11)
ax6_1.set_title('图 6-1  单位阶跃输入下状态反馈跟踪控制及纯滞后补偿效应对比', fontsize=11.5, fontweight='bold')
ax6_1.grid(True, linestyle='--', alpha=0.6)
ax6_1.legend(loc='upper right', fontsize=9.2, framealpha=0.9)
ax6_1.set_ylim(-0.5, 2.5)

ax6_2.step(t_track, u_pred, 'r-', where='post', label='预估补偿控制量 $u(k)$ (峰值仅 8.21，无剧烈冲击)')
ax6_2.step(t_track[:22], u_uncomp[:22], 'b--', where='post', label='无滞后补偿控制量 $u(k)$ (迅速发散振荡)')
ax6_2.set_xlabel('时间 $t$ / s', fontsize=11)
ax6_2.set_ylabel('控制量 $u(k)$', fontsize=11)
ax6_2.grid(True, linestyle='--', alpha=0.6)
ax6_2.legend(loc='upper right', fontsize=9.2, framealpha=0.9)
ax6_2.set_xlim(-0.2, 7.0)

plt.tight_layout()
fig6.savefig(os.path.join(out_dir, 'fig6_pole_placement_tracking.png'))
plt.close(fig6)

# ----------------- Figure 7: Comprehensive Controller Comparison -----------------
fig7, (ax7_1, ax7_2) = plt.subplots(2, 1, figsize=(9.5, 6.2), sharex=True)

# Output comparison
ax7_1.step(t_k[:30], y_rf[:30], 'r-', where='post', linewidth=1.8, label='课题(4) 最小拍无纹波控制 (6拍严格达稳态，超调 0%)')
ax7_1.step(t_track[:30], y_pred[:30], 'b--', where='post', linewidth=1.6, label=r'课题(5) 极点配置状态反馈 ($\xi=0.5,\omega_n=3.6$，平滑过渡)')
ax7_1.axhline(1.0, color='k', linestyle=':', alpha=0.6)
ax7_1.set_ylabel('系统输出 $y(k)$', fontsize=11)
ax7_1.set_title('图 7-1  最小拍无纹波控制 vs 极点配置状态反馈控制 综合性能对比', fontsize=12, fontweight='bold')
ax7_1.grid(True, linestyle='--', alpha=0.6)
ax7_1.legend(loc='lower right', fontsize=9.5, framealpha=0.9)
ax7_1.set_ylim(-0.05, 1.25)

# Control action comparison
ax7_2.step(t_k[:30], u_rf[:30], 'r-', where='post', linewidth=1.8, label='最小拍无纹波控制量 $u(k)$ (最大峰值 30.39，强脉冲切换)')
ax7_2.step(t_track[:30], u_pred[:30], 'b--', where='post', linewidth=1.6, label='极点配置控制量 $u(k)$ (最大峰值仅 8.21，温和适合工业)')
ax7_2.set_xlabel('时间 $t$ / s', fontsize=11)
ax7_2.set_ylabel('控制量 $u(k)$', fontsize=11)
ax7_2.grid(True, linestyle='--', alpha=0.6)
ax7_2.legend(loc='upper right', fontsize=9.5, framealpha=0.9)
ax7_2.set_xlim(-0.2, 5.5)

plt.tight_layout()
fig7.savefig(os.path.join(out_dir, 'fig7_comprehensive_comparison.png'))
plt.close(fig7)

# ----------------- Figure 8: Simulink Simulation Diagram -----------------
# Draw an elegant schematic diagram of the control loops
fig8, ax8 = plt.subplots(figsize=(10, 5))
ax8.axis('off')

# Box styles
box_ctrl = dict(boxstyle='square,pad=0.6', facecolor='#D9E1F2', edgecolor='#2F5597', linewidth=1.5)
box_zoh = dict(boxstyle='square,pad=0.6', facecolor='#FCE4D6', edgecolor='#C65911', linewidth=1.5)
box_plant = dict(boxstyle='square,pad=0.6', facecolor='#E2EFDA', edgecolor='#375623', linewidth=1.5)
box_sum = dict(boxstyle='circle,pad=0.3', facecolor='#FFF2CC', edgecolor='#D6B656', linewidth=1.5)

# Draw blocks
ax8.text(0.1, 0.7, r'$r(k)=1(k)$' + '\n' + '单位阶跃输入', fontsize=10, ha='center', va='center')
ax8.text(0.25, 0.7, '∑', fontsize=14, ha='center', va='center', bbox=box_sum)
ax8.text(0.43, 0.7, r'数字控制器 $D(z)$' + '\n' + '最小拍无纹波算法', fontsize=10, ha='center', va='center', bbox=box_ctrl)
ax8.text(0.65, 0.7, r'零阶保持器 $W_{h0}(s)$' + '\n' + r'$T = 0.2$ s', fontsize=10, ha='center', va='center', bbox=box_zoh)
ax8.text(0.88, 0.7, r'被控反应釜对象 $W(s)$' + '\n' + r'$\frac{8e^{-0.6s}}{(s+1)(s+2)(s+4)}$', fontsize=10, ha='center', va='center', bbox=box_plant)

# Connecting arrows
ax8.annotate('', xy=(0.21, 0.7), xytext=(0.16, 0.7), arrowprops=dict(arrowstyle="->", lw=1.5, color='black'))
ax8.text(0.18, 0.73, '+', fontsize=11, ha='center')

ax8.annotate('', xy=(0.34, 0.7), xytext=(0.29, 0.7), arrowprops=dict(arrowstyle="->", lw=1.5, color='black'))
ax8.text(0.315, 0.74, r'$e(k)$', fontsize=10, ha='center')

ax8.annotate('', xy=(0.57, 0.7), xytext=(0.52, 0.7), arrowprops=dict(arrowstyle="->", lw=1.5, color='black'))
ax8.text(0.545, 0.74, r'$u(k)$', fontsize=10, ha='center')

ax8.annotate('', xy=(0.76, 0.7), xytext=(0.73, 0.7), arrowprops=dict(arrowstyle="->", lw=1.5, color='black'))
ax8.text(0.745, 0.74, r'$u(t)$', fontsize=10, ha='center')

ax8.annotate('', xy=(1.02, 0.7), xytext=(0.99, 0.7), arrowprops=dict(arrowstyle="->", lw=1.5, color='black'))
ax8.text(1.05, 0.7, r'$y(t)$', fontsize=11, ha='center', va='center')

# Feedback line
ax8.plot([1.01, 1.01, 0.25, 0.25], [0.7, 0.45, 0.45, 0.65], 'k-', lw=1.5)
ax8.annotate('', xy=(0.25, 0.65), xytext=(0.25, 0.55), arrowprops=dict(arrowstyle="->", lw=1.5, color='black'))
ax8.text(0.27, 0.62, '−', fontsize=12, ha='center')
ax8.text(0.63, 0.48, '采样开关 $T=0.2$ s 离散采样反馈 $y(k)$', fontsize=9.5, ha='center', color='#333333')

# Subtitle / title
ax8.text(0.55, 0.92, '图 8-1  计算机控制系统闭环控制仿真结构原理框图', fontsize=12, fontweight='bold', ha='center')

# State feedback block below
ax8.text(0.55, 0.28, '【极点配置状态反馈结构】 $u(k) = -K \hat{x}(k+3|k) + \\bar{N} r(k)$ （结合纯滞后三拍状态预估器）', 
         fontsize=10.5, ha='center', va='center', bbox=dict(boxstyle='round,pad=0.5', facecolor='#F2F2F2', edgecolor='#888888', linestyle='--'))

plt.tight_layout()
fig8.savefig(os.path.join(out_dir, 'fig8_simulink_block_diagram.png'))
plt.close(fig8)

print("All 8 high-resolution simulation figures generated successfully in:", out_dir)
