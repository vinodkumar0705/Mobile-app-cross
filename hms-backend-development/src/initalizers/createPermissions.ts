import { permissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const createPermissions = async () => {
    try {

            await prisma.permission.deleteMany();
            const newPermissions = await prisma.permission.createMany({
                data: permissions as any,
            });
            console.log("Permissions and roles created");
 
    } catch (error) {
        console.log("Error creating permissions and roles", error);
    }
};
