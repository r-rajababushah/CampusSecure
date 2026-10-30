"""
Classes router — /api/v1/classes
"""
from fastapi import APIRouter, HTTPException, Depends

from core.database import db
from routers.deps import get_current_user, require_roles

router = APIRouter()


@router.get("/")
async def list_classes(current_user=Depends(get_current_user)):
    role = current_user["role"]
    if role == "admin":
        classes = list(db.classes)
    elif role == "faculty":
        classes = [c for c in db.classes if c["facultyId"] == current_user["_id"]]
    else:
        # Student: only enrolled classes
        enrolled_class_ids = {e["classId"] for e in db.enrollments if e["studentId"] == current_user["_id"] and e["status"] == "enrolled"}
        classes = [c for c in db.classes if c["_id"] in enrolled_class_ids]

    enriched = []
    for cls in classes:
        faculty = db.get_user_by_id(cls["facultyId"])
        student_count = sum(1 for e in db.enrollments if e["classId"] == cls["_id"] and e["status"] == "enrolled")
        enriched.append({
            **cls,
            "facultyName": faculty["fullName"] if faculty else "Unknown",
            "studentCount": student_count,
        })
    return {"success": True, "data": enriched}


@router.get("/{class_id}")
async def get_class(class_id: str, current_user=Depends(get_current_user)):
    cls = next((c for c in db.classes if c["_id"] == class_id), None)
    if not cls:
        raise HTTPException(status_code=404, detail={"code": "CLASS_NOT_FOUND", "message": "Class not found."})

    role = current_user["role"]
    if role == "student":
        enrolled = any(e["classId"] == class_id and e["studentId"] == current_user["_id"] and e["status"] == "enrolled" for e in db.enrollments)
        if not enrolled:
            raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "You are not enrolled in this class."})
    elif role == "faculty" and cls["facultyId"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "You are not assigned to this class."})

    faculty = db.get_user_by_id(cls["facultyId"])
    student_count = sum(1 for e in db.enrollments if e["classId"] == class_id and e["status"] == "enrolled")
    return {"success": True, "data": {**cls, "facultyName": faculty["fullName"] if faculty else "Unknown", "studentCount": student_count}}


@router.get("/{class_id}/students")
async def get_class_students(class_id: str, current_user=Depends(get_current_user)):
    cls = next((c for c in db.classes if c["_id"] == class_id), None)
    if not cls:
        raise HTTPException(status_code=404, detail={"code": "CLASS_NOT_FOUND", "message": "Class not found."})

    role = current_user["role"]
    if role == "student":
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Students cannot view class rosters."})
    if role == "faculty" and cls["facultyId"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "You are not assigned to this class."})

    enrollments = [e for e in db.enrollments if e["classId"] == class_id and e["status"] == "enrolled"]
    students = []
    for enr in enrollments:
        student = db.get_user_by_id(enr["studentId"])
        if student:
            students.append({
                "enrollmentId": enr["_id"],
                "userId": student["_id"],
                "fullName": student["fullName"],
                "email": student["email"],
                "studentOrStaffId": student["studentOrStaffId"],
                "department": student["department"],
                "enrolledAt": enr["enrolledAt"],
                "status": enr["status"],
            })
    return {"success": True, "data": students}
