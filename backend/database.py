from sqlalchemy import JSON, ForeignKey, create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///./api_test_studio.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


    
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=True, comment="Project name")
    base_url = Column(String, nullable=True, comment="Base URL for the project")
    openapi_content = Column(JSON, nullable=True, comment="OpenAPI file content")

class Api(Base):
    __tablename__ = "apis"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String, index=True, nullable=True, comment="API name")
    method = Column(String, index=True, nullable=True, comment="HTTP method")   
    url = Column(String, index=True, nullable=True, comment="API URL")      

    headers_params = Column(JSON, default={})
    query_params = Column(JSON, default={})
    path_params = Column(JSON, default={})

    body_params = Column(JSON, default={})

class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    api_id = Column(Integer, ForeignKey("apis.id", ondelete="CASCADE"), nullable=False)

    name = Column(String, nullable=True, comment="Test case name")
    description = Column(String, nullable=True, comment="Test case description")

    headers_params = Column(JSON, default={})                                                              
    query_params = Column(JSON, default={})
    path_params = Column(JSON, default={})

    body_params = Column(JSON, default={})
