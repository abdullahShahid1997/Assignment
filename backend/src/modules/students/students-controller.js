const asyncHandler = require("express-async-handler");
const { getAllStudents, getStudentDetail, setStudentStatus } = require("./students-service");
const { ApiError, sendAccountVerificationEmail } = require("../../utils");
const { addOrUpdateStudent } = require("./students-repository");

const truncate = (value, max) => {
    if (typeof value !== "string") return value;
    return value.length > max ? value.slice(0, max) : value;
};

const normalizeStudentPayloadForDb = (body) => {
    const b = body || {};
    return {
        ...b,
        name: truncate(b.name, 100),
        email: truncate(b.email, 100),
        gender: truncate(b.gender, 10),
        phone: truncate(b.phone, 20),
        class: truncate(b.class, 50),
        section: truncate(b.section, 50),
        currentAddress: truncate(b.currentAddress, 50),
        permanentAddress: truncate(b.permanentAddress, 50),
        fatherName: truncate(b.fatherName, 50),
        fatherPhone: truncate(b.fatherPhone, 20),
        motherName: truncate(b.motherName, 50),
        motherPhone: truncate(b.motherPhone, 20),
        guardianName: truncate(b.guardianName, 50),
        guardianPhone: truncate(b.guardianPhone, 20),
        relationOfGuardian: truncate(b.relationOfGuardian, 30),
    };
};

const handleGetAllStudents = asyncHandler(async (req, res) => {
    const { name, section } = req.query;
    const className = req.query.class;
    const rollRaw = req.query.roll;
    const roll = typeof rollRaw === "string" && rollRaw.trim() !== "" ? Number(rollRaw) : undefined;

    const payload = {
        name,
        className,
        section,
        roll: Number.isFinite(roll) ? roll : undefined,
    };

    const students = await getAllStudents(payload);
    res.json({ students });
});

const handleAddStudent = asyncHandler(async (req, res) => {
    const ADD_STUDENT_AND_EMAIL_SEND_SUCCESS = "Student added and verification email sent successfully.";
    const ADD_STUDENT_AND_BUT_EMAIL_SEND_FAIL = "Student added, but failed to send verification email.";

    const payload = normalizeStudentPayloadForDb(req.body);
    const result = await addOrUpdateStudent(payload);
    if (!result.status) {
        console.error("[STUDENT_ADD_FAILED]", {
            message: result?.message,
            description: result?.description,
            context: {
                email: payload?.email,
                class: payload?.class,
                section: payload?.section,
                roll: payload?.roll,
            }
        });
        const statusCode = result.message === "Email already exists" ? 409 : 500;
        throw new ApiError(statusCode, result.message);
    }

    try {
        await sendAccountVerificationEmail({ userId: result.userId, userEmail: payload.email });
        res.json({ message: ADD_STUDENT_AND_EMAIL_SEND_SUCCESS, id: result.userId });
    } catch (error) {
        res.json({ message: ADD_STUDENT_AND_BUT_EMAIL_SEND_FAIL, id: result.userId });
    }
});

const handleUpdateStudent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = normalizeStudentPayloadForDb({ userId: Number(id), ...req.body });

    const result = await addOrUpdateStudent(payload);
    if (!result.status) {
        console.error("[STUDENT_UPDATE_FAILED]", {
            message: result?.message,
            description: result?.description,
            context: {
                userId: Number(id),
                email: req.body?.email,
                class: req.body?.class,
                section: req.body?.section,
                roll: req.body?.roll,
            }
        });
        const statusCode = result.message === "Email already exists" ? 409 : 500;
        throw new ApiError(statusCode, result.message);
    }

    res.json({ message: result.message });
});

const handleGetStudentDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const student = await getStudentDetail(id);
    res.json(student);
});

const handleStudentStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const reviewerId = req.user?.id;
    const message = await setStudentStatus({ userId: Number(id), reviewerId, status });
    res.json(message);
});

module.exports = {
    handleGetAllStudents,
    handleGetStudentDetail,
    handleAddStudent,
    handleStudentStatus,
    handleUpdateStudent,
};
