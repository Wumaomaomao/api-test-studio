from fastapi import FastAPI
from router.project import router as project_router
from database import Base, engine, run_lightweight_migrations
from fastapi.middleware.cors import CORSMiddleware

# 创建数据库表
Base.metadata.create_all(bind=engine)
run_lightweight_migrations()

app = FastAPI()

# 注册路由
app.include_router(project_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:5175", "http://localhost:5175"], 
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有的请求方法 (GET, POST, OPTIONS 等)
    allow_headers=["*"],  # 允许所有的请求头
)

@app.get("/")
def read_root():
    return {"message": "Hello, World!"}

def main():
    print("Hello from backend!")


if __name__ == "__main__":
    main()
