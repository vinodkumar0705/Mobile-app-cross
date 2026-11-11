import { prisma } from "@/lib/prisma";
import { OrganizationStatus } from "@prisma/client";
import { connect } from "node:http2";
import { promise } from "zod";
export function random(i:number) {
    return Math.floor(Math.random() * i||10);
}
export async function createOrganization() {
    try {
        const organization = await prisma.$transaction(
            async (tx) => {
                const organizations = await tx.organization.createManyAndReturn({
                    data: [
                        {
                            brandName: "Organization 1",
                            legalName: "Organization 1",
                            status: OrganizationStatus.ACTIVE,

                        },
                    ],
                    select: {
                        id: true,
                    },
                });

                const branches = (
                    await Promise.all(
                        organizations.map((organization) => {
                            return tx.branch.createManyAndReturn({
                                data: [
                                    {
                                        name: "Branch 1",
                                        organizationId: organization.id,
                                    },
                                    {
                                        name: "Branch 2",
                                        organizationId: organization.id,
                                    },
                                ],
                                select: {
                                    id: true,
                                },
                            });
                        })
                    )
                ).flatMap((branch) => branch);

                const buildings = (
                    await Promise.all(
                        branches.map((branch, i) => {
                            return tx.building.createManyAndReturn({
                                data: [
                                    {
                                        name: "Building 1" + String(i),
                                        branchId: branch.id,
                                    },
                                    {
                                        name: "Building 2" + String(i),
                                        branchId: branch.id,
                                    },
                                ],
                                select: {
                                    id: true,
                                },
                            });
                        })
                    )
                ).flatMap((building) => building);
                const floors = (
                    await Promise.all(
                        buildings.map((building, i) => {
                            return tx.floor.createManyAndReturn({
                                data: [
                                    {
                                        name: "Floor 1" + String(i),
                                        buildingId: building.id,
                                    },
                                    {
                                        name: "Floor 2" + String(i),
                                        buildingId: building.id,
                                    },
                                ],
                                select: {
                                    id: true,
                                    name: true,
                                    building: {
                                        select: {
                                            name: true,
                                        },
                                    },
                                },
                            });
                        })
                    )
                ).flatMap((floor) => floor);
                await tx.roomType.deleteMany();
                const roomTypes = (
                    await tx.roomType.createManyAndReturn({
                        data: [
                            {
                                name: "General Ward",
                            },
                            {
                                name: "Single Sharing",
                            },
                            {
                                name: "Double Sharing",
                            },
                            {
                                name: "ICU (Intensive Care Unit)",
                            },
                           
                        ],
                        select: {
                            id: true,
                        },
                    })
                ).flatMap((roomType) => roomType);
                await tx.amenity.deleteMany();
                const amenity = await tx.amenity.createManyAndReturn({
                    data:[
                        {
                            name:"AC",
                            icon:"snowflake"
                        },
                      
                        {
                            name:"TV",
                            icon:"tv"
                        },
                        {
                            name:"Wifi",
                            icon:"wifi"
                        },
                        

                    ]
                    
                })
                const rooms = (
                    await Promise.all(
                        floors.map((floor, i) => {
                            return tx.room.createManyAndReturn({
                                data: [
                                    {
                                        name: "Room 1",
                                        floorId: floor.id,
                                        roomTypeId: roomTypes[random(4)].id,
                                        
                                        roomNumber: floor.building.name + "-" + String(i) + "-" + "01",
                                    },
                                    {
                                        name: "Room 2",
                                        floorId: floor.id,
                                        roomTypeId: roomTypes[random(4)].id,
                                        roomNumber: floor.building.name + "-" + String(i) + "-" + "02",
                                    },
                                ],
                                select: {
                                    id: true,
                                },
                            });
                        })
                    )
                ).flatMap((room) => room);
                await Promise.all(
                    rooms.map((room) => {
                        return tx.room.update({
                            where: {
                                id: room.id,
                            },
                            data: {
                                amenities:{
                                    connect:[amenity[random(3)]]
                                }
                            },
                        });
                    })
                );

                // throw Error("Error creating organization");
                return await tx.organization.findMany({
                    select: {
                        brandName: true,
                        legalName: true,
                        branches: {
                            select: {
                                name: true,
                                buildings: {
                                    select: {
                                        name: true,
                                        floor: {
                                            select: {
                                                name: true,
                                                room: {
                                                    select: {
                                                        name: true,
                                                        roomNumber: true,
                                                        roomType: {
                                                            select: {
                                                                name: true,
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                });
            },
            {
                maxWait: 60000,
                timeout: 60000,
            }
        );
        console.log("Organization created");
        console.dir(organization, { depth: null });
    } catch (error) {
        console.log("Error creating organization", error);
    }
}
