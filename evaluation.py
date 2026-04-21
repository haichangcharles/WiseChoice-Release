import json
import pandas as pd
import re

# =================配置参数=================
AVG_READING_SPEED = 238.0  # Brysbaert, 2019
CFCR_BASELINE = 64.0       # Vedula et al., 2022
INPUT_FILE = 'analysis_log.json' 
OUTPUT_EXCEL = 'WiseChoice_Evaluation_Results.xlsx'
# =========================================

def count_words(text):
    """计算英文单词数"""
    if not text: return 0
    return len(str(text).split())

def count_bullet_points(text):
    """
    计算 CFCR: 统计 "- " 开头的决策点数量
    """
    if not text: return 0
    return text.count("- ")

def main():
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            dataset = json.load(f)
    except FileNotFoundError:
        print(f"❌ 错误: 找不到文件 {INPUT_FILE}")
        return

    results = []
    print(f"📊 正在分析 {len(dataset)} 组数据...")

    for item in dataset:
        # 1. 解析原始数据 (Raw Input)
        # 注意: 你的JSON里 raw_input 下面是 product_a_text 和 product_b_text
        raw_a = item.get('raw_input', {}).get('product_a_text', '')
        raw_b = item.get('raw_input', {}).get('product_b_text', '')
        
        # 2. 解析生成数据 (WiseChoice Output)
        output = item.get('wisechoice_output', {})
        
        # 拼接全文 (Title + TLDR + Strategy + Analysis + Reasons)
        full_report_str = f"{output.get('title','')} {output.get('tldr','')} {output.get('strategy','')} {output.get('analysis','')} {output.get('reasons','')}"
        
        # 获取 Analysis 板块 (用于 RR_diff)
        analysis_text = output.get('analysis', '')
        strategy_text = output.get('strategy', '')

        # =================指标计算=================

        # --- A. 基础统计 ---
        wc_raw = count_words(raw_a) + count_words(raw_b)
        wc_wise_total = count_words(full_report_str)
        wc_wise_diff_only = count_words(analysis_text)

        # --- B. H1: Reading Load (阅读负载) ---
        time_raw = wc_raw / AVG_READING_SPEED
        time_wise = wc_wise_total / AVG_READING_SPEED
        
        # RR_full (全文压缩率)
        rr_full = (1 - (wc_wise_total / wc_raw)) if wc_raw > 0 else 0

        # --- C. H2: Decision Efficiency (决策效率) ---
        # RR_diff (关键差异压缩率)
        rr_diff = (1 - (wc_wise_diff_only / wc_raw)) if wc_raw > 0 else 0

        # CFCR (认知因子压缩率)
        # 逻辑: (Strategy点数 + Analysis点数) / 64
        points_strategy = count_bullet_points(strategy_text)
        points_analysis = count_bullet_points(analysis_text)
        total_points = points_strategy + points_analysis
        cfcr = total_points / CFCR_BASELINE

        # 整理行数据
        results.append({
            "ID": item.get('id'),
            "Category": item.get('category'),
            # 原始数据
            "Raw_WC": wc_raw,
            "Wise_Total_WC": wc_wise_total,
            "Wise_Analysis_WC": wc_wise_diff_only,
            # H1 Metrics
            "Time_Raw (min)": round(time_raw, 2),
            "Time_Wise (min)": round(time_wise, 2),
            "RR_full (%)": round(rr_full * 100, 2),
            # H2 Metrics
            "RR_diff (%)": round(rr_diff * 100, 2),
            "CFCR_Points": total_points,
            "CFCR (Ratio)": round(cfcr, 3),
            # H3 Placeholder (留给你填)
            "TBR_Manual_Check": "" 
        })

    # 导出 Excel
    df = pd.DataFrame(results)
    df.to_excel(OUTPUT_EXCEL, index=False)

    print("\n✅ 分析完成！结果已保存至 Excel。")
    print("=== 初步均值预览 ===")
    print(f"平均全文压缩率 (RR_full): {df['RR_full (%)'].mean():.2f}%")
    print(f"平均差异压缩率 (RR_diff): {df['RR_diff (%)'].mean():.2f}%")
    print(f"平均 CFCR: {df['CFCR (Ratio)'].mean():.3f}")

if __name__ == "__main__":
    main()