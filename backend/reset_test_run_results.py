#!/usr/bin/env python3
"""
重新创建 test_run_results 表（删除并重建）
保留其他所有表的数据
"""
from database import engine, TestRunResult, Base
from sqlalchemy import text

def reset_test_run_results_table():
    """删除并重新创建 test_run_results 表"""
    with engine.begin() as conn:
        # 检查表是否存在
        result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='test_run_results'"))
        table_exists = result.fetchone() is not None
        
        if table_exists:
            print("⚠️  删除现有的 test_run_results 表...")
            # 先禁用外键约束，然后删除表
            conn.execute(text("PRAGMA foreign_keys=OFF"))
            conn.execute(text("DROP TABLE IF EXISTS test_run_results"))
            conn.execute(text("PRAGMA foreign_keys=ON"))
            print("✅ test_run_results 表已删除")
        
        # 重新创建表
        print("📝 重新创建 test_run_results 表...")
        Base.metadata.tables['test_run_results'].create(engine, checkfirst=False)
        print("✅ test_run_results 表已重新创建（带有新字段）")

if __name__ == "__main__":
    try:
        reset_test_run_results_table()
        print("\n✨ 操作完成！test_run_results 表已重置。")
    except Exception as e:
        print(f"\n❌ 错误: {e}")
