import matplotlib.pyplot as plt
import numpy as np

# ==========================================
# 1. 数据准备 (Data Setup)
# ==========================================
# 格式: [Mean_Control, Mean_Treatment]
data_time = [4.14, 1.80]
data_volume = [986.42, 427.58, 147.25] # Raw, Wise_Full, Wise_Diff
data_cfcr = [64.00, 9.83]

# 标准差 (Standard Deviations)
err_time = [0.90, 0.15]
err_volume = [215.22, 35.26, 24.63]
err_cfcr = [0.00, 0.83] # Baseline SD is 0

# 效应量 (Effect Sizes)
d_time = 2.70
d_vol_full = 2.69
d_vol_diff = 4.11
d_cfcr = 64.88

# ==========================================
# 2. 绘图设置 (Plot Settings)
# ==========================================
# 设置学术风格配色: Control=深灰, Treatment=亮蓝
colors = ['#636363', '#2b83ba', '#2b83ba'] 
# 设置字体 (尽量使用无衬线字体以匹配 IEEE/ACM 风格)
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['Arial', 'DejaVu Sans']
plt.rcParams['font.size'] = 10

fig, axes = plt.subplots(1, 3, figsize=(15, 5), constrained_layout=True)

# Helper function to draw significance brackets
def draw_bracket(ax, x1, x2, y, h, text):
    ax.plot([x1, x1, x2, x2], [y, y+h, y+h, y], lw=1.5, c='k')
    ax.text((x1+x2)*.5, y+h, text, ha='center', va='bottom', color='k', fontweight='bold')

# ==========================================
# 3. 子图 1: 阅读时间 (H1)
# ==========================================
ax1 = axes[0]
x1 = np.arange(2)
bars1 = ax1.bar(x1, data_time, yerr=err_time, capsize=5, 
                color=[colors[0], colors[1]], alpha=0.9, width=0.6)
ax1.set_xticks(x1)
ax1.set_xticklabels(['Raw Page', 'WiseChoice'])
ax1.set_ylabel('Time (minutes)')
ax1.set_title('(a) Estimated Reading Time (H1)', fontweight='bold', pad=15)
ax1.set_ylim(0, 6)

# 添加数值标签
for rect in bars1:
    height = rect.get_height()
    ax1.text(rect.get_x() + rect.get_width()/2., height + 0.1,
             f'{height:.2f}m', ha='center', va='bottom')

# 添加显著性标记
draw_bracket(ax1, 0, 1, 5.2, 0.2, f"***\n(d={d_time:.2f})")

# ==========================================
# 4. 子图 2: 信息量对比 (H1 & H2)
# ==========================================
ax2 = axes[1]
x2 = np.arange(3)
bars2 = ax2.bar(x2, data_volume, yerr=err_volume, capsize=5, 
                color=[colors[0], colors[1], '#1a557a'], alpha=0.9, width=0.6)
# 第三个柱子用深一点的蓝色表示 "Analysis Only"
bars2[2].set_color('#1a557a') 

ax2.set_xticks(x2)
ax2.set_xticklabels(['Raw Text', 'Wise Full', 'Wise Diff'])
ax2.set_ylabel('Word Count')
ax2.set_title('(b) Information Volume (H1 & H2)', fontweight='bold', pad=15)
ax2.set_ylim(0, 1400)

# 添加数值标签
for rect in bars2:
    height = rect.get_height()
    ax2.text(rect.get_x() + rect.get_width()/2., height + 30,
             f'{int(height)}', ha='center', va='bottom')

# 显著性 - Full
draw_bracket(ax2, 0, 1, 1100, 50, f"*** (d={d_vol_full:.2f})")
# 显著性 - Diff (稍微高一点以避免重叠)
draw_bracket(ax2, 0, 2, 1280, 50, f"*** (d={d_vol_diff:.2f})")

# ==========================================
# 5. 子图 3: 认知因子 (H2)
# ==========================================
ax3 = axes[2]
x3 = np.arange(2)
bars3 = ax3.bar(x3, data_cfcr, yerr=err_cfcr, capsize=5, 
                color=[colors[0], colors[1]], alpha=0.9, width=0.6)
ax3.set_xticks(x3)
ax3.set_xticklabels(['Baseline\n(Vedula et al.)', 'WiseChoice\nFactors'])
ax3.set_ylabel('Number of Cognitive Factors')
ax3.set_title('(c) Cognitive Complexity (H2)', fontweight='bold', pad=15)
ax3.set_ylim(0, 85)

# 添加数值标签
ax3.text(0, 64 + 1, '64 (Fixed)', ha='center', va='bottom')
ax3.text(1, 9.83 + 1.5, '9.8', ha='center', va='bottom')

# 显著性
draw_bracket(ax3, 0, 1, 70, 3, f"***\n(d={d_cfcr:.2f})")

# ==========================================
# 6. 保存与显示
# ==========================================
# 移除顶部和右侧的边框 (Tufte style / Academic style)
for ax in axes:
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.grid(axis='y', linestyle='--', alpha=0.3)

plt.savefig('evaluation_results_chart.png', dpi=300, bbox_inches='tight')
print("Chart generated successfully: evaluation_results_chart.png")
plt.show() # 如果在本地运行，取消注释以预览