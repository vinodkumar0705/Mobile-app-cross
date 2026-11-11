export function sanitizeUser(user: any) {
    const { id, fName, lName, phoneNumber, email, roles, isAdmin, isDoctor, isPatient } = user;
    return { id: id || user.userId, fName, lName, phoneNumber, email, roles, isAdmin, isDoctor, isPatient };
}
