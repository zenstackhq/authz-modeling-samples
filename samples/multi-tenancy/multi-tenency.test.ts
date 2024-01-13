import { enhance } from '@zenstackhq/runtime';
import { inspect } from 'util';
import { PrismaClient } from './.prisma/client';

it('Multi-tenancy test', async () => {
    const prisma = new PrismaClient();

    // clean up
    await prisma.org.deleteMany();
    await prisma.user.deleteMany();

    // create users
    const emily = await prisma.user.create({
        data: { name: 'Emily' },
    });
    const adam = await prisma.user.create({
        data: { name: 'Adam' },
    });
    const joe = await prisma.user.create({
        data: { name: 'Joe' },
    });

    // create two orgs

    // Emily as admin of org Apple
    const apple = await prisma.org.create({
        data: {
            name: 'Apple',
            members: {
                create: [
                    {
                        user: { connect: { id: emily.id } },
                        role: 'ADMIN',
                    },
                ],
            },
        },
    });

    // Joe as admin of org Microsoft
    const microsoft = await prisma.org.create({
        data: {
            name: 'Microsoft',
            members: {
                create: [{ user: { connect: { id: joe.id } }, role: 'ADMIN' }],
            },
        },
    });

    // create an enhanced PrismaClient for each user
    const emilyDb = enhance(prisma, { user: emily }, { loadPath: '.zenstack' });
    const adamDb = enhance(prisma, { user: adam }, { loadPath: '.zenstack' });
    const joeDb = enhance(prisma, { user: joe }, { loadPath: '.zenstack' });

    // Emily should be able to add Adam to the org
    await emilyDb.org.update({
        where: { id: apple.id },
        data: {
            members: {
                create: [
                    { user: { connect: { id: adam.id } }, role: 'MEMBER' },
                ],
            },
        },
    });

    // Adam shouldn't be able to add Joe to the org because he's not admin
    await expect(
        adamDb.org.update({
            where: { id: apple.id },
            data: {
                members: {
                    create: [
                        { user: { connect: { id: joe.id } }, role: 'MEMBER' },
                    ],
                },
            },
        })
    ).rejects.toThrow();

    // Emily should be able to create a resource in org Apple
    const res = await emilyDb.resource.create({
        data: {
            name: 'resource1',
            public: true,
            org: { connect: { id: apple.id } },
            owner: { connect: { id: emily.id } },
        },
    });
    console.log('Resource created by Emily:', inspect(res));

    // Emily shouldn't be able to create a resource in org Microsoft
    await expect(
        emilyDb.resource.create({
            data: {
                name: 'resource2',
                org: { connect: { id: microsoft.id } },
                owner: { connect: { id: emily.id } },
            },
        })
    ).rejects.toThrow();

    // the resource is readable to Adam
    const resByAdam = await adamDb.resource.findUnique({
        where: { id: res.id },
    });
    console.log('Resource read by Adam:', inspect(resByAdam));
    expect(resByAdam).toBeTruthy();

    // the resource is not readable to Joe
    const resByJoe = await joeDb.resource.findUnique({
        where: { id: res.id },
    });
    console.log('Resource read by Joe:', inspect(resByJoe));
    expect(resByJoe).toBeNull();
});
