from fastapi import APIRouter, HTTPException, UploadFile, Form, Depends
from sqlalchemy.orm import Session
from database import SessionLocal, Project, Api
from services.openapi_parser import parse_openapi, extract_apis_from_openapi, extract_project_info
import json

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/projects")
async def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    return [{"id": p.id, "name": p.name, "base_url": p.base_url} for p in projects]

@router.post("/projects")
async def create_project(
    name: str = Form(...),
    base_url: str = Form(default=""),
    openapi_file: UploadFile = None,
    db: Session = Depends(get_db),
):
    if not name.strip():
        raise HTTPException(status_code=400, detail="Project name is required")

    existing_project = db.query(Project).filter(Project.name == name).first()
    if existing_project:
        raise HTTPException(status_code=400, detail="Project name already exists")

    openapi_content = None
    apis_to_create = []
    
    # 如果上传了OpenAPI文件，则解析并导入API
    if openapi_file:
        try:
            # 确定文件格式
            filename = openapi_file.filename.lower()
            if filename.endswith('.yaml') or filename.endswith('.yml'):
                file_format = 'yaml'
            elif filename.endswith('.json'):
                file_format = 'json'
            else:
                raise ValueError("Only .json, .yaml, and .yml formats are supported")
            
            # 读取文件内容
            content = await openapi_file.read()
            content_str = content.decode('utf-8')
            
            # 解析OpenAPI文档
            spec = parse_openapi(content_str, file_format)
            openapi_content = spec
            
            # 从OpenAPI提取项目信息，如果没有提供base_url则使用OpenAPI中的
            project_info = extract_project_info(spec)
            if not base_url.strip():
                base_url = project_info['base_url']
            if not name.strip():
                name = project_info['name']
            
            # 提取API列表
            apis_to_create = extract_apis_from_openapi(spec)
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse OpenAPI file: {str(e)}")

    # 创建项目
    new_project = Project(name=name, base_url=base_url.strip() if base_url else "", openapi_content=openapi_content)
    db.add(new_project)
    db.flush()  # 获取project_id
    
    # 如果有解析出的API，就自动创建它们
    if apis_to_create:
        for api_info in apis_to_create:
            new_api = Api(
                project_id=new_project.id,
                name=api_info['name'],
                method=api_info['method'],
                url=api_info['url']
            )
            db.add(new_api)
    
    db.commit()
    db.refresh(new_project)

    return {
        "id": new_project.id,
        "name": new_project.name,
        "base_url": new_project.base_url,
        "apis_imported": len(apis_to_create)
    }

@router.get("/projects/{project_id}/apis")
async def list_apis(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    apis = db.query(Api).filter(Api.project_id == project_id).all()
    return [{"id": a.id, "name": a.name, "method": a.method, "url": a.url} for a in apis]

@router.post("/projects/{project_id}/apis")
async def create_api(
    project_id: int,
    name: str = Form(...),
    method: str = Form(...),
    url: str = Form(...),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not name.strip():
        raise HTTPException(status_code=400, detail="API name is required")
    
    if not method.strip():
        raise HTTPException(status_code=400, detail="HTTP method is required")
    
    if not url.strip():
        raise HTTPException(status_code=400, detail="API URL is required")
    
    new_api = Api(project_id=project_id, name=name, method=method, url=url)
    db.add(new_api)
    db.commit()
    db.refresh(new_api)
    
    return {"id": new_api.id, "name": new_api.name, "method": new_api.method, "url": new_api.url}

@router.delete("/projects/{project_id}/apis/{api_id}")
async def delete_api(project_id: int, api_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    api = db.query(Api).filter(Api.id == api_id, Api.project_id == project_id).first()
    if not api:
        raise HTTPException(status_code=404, detail="API not found")
    
    db.delete(api)
    db.commit()
    
    return {"message": "API deleted successfully"}