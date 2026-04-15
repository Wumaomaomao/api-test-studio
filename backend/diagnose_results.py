#!/usr/bin/env python3
"""
诊断脚本：检查test_run_results表的数据
"""
from database import SessionLocal, TestRunResult
from sqlalchemy import inspect

db = SessionLocal()

try:
    # 检查表结构
    inspector = inspect(db.bind)
    columns = inspector.get_columns('test_run_results')
    print("📋 test_run_results 表的列：")
    for col in columns:
        print(f"  - {col['name']}: {col['type']}")
    
    print("\n" + "="*50 + "\n")
    
    # 查询最近的记录
    results = db.query(TestRunResult).order_by(TestRunResult.id.desc()).limit(5).all()
    
    if not results:
        print("⚠️  数据库中没有任何test_run_results记录")
    else:
        print(f"📊 最近5条记录：\n")
        for r in results:
            print(f"ID: {r.id}")
            print(f"  request_url: {r.request_url}")
            print(f"  request_headers: {r.request_headers}")
            print(f"  request_body: {r.request_body}")
            print(f"  request_query: {r.request_query}")
            print()

finally:
    db.close()
