import { enhance } from '@zenstackhq/runtime';
import { inspect } from 'util';
import { PrismaClient } from './.prisma/client';

it('RBAC test', async () => {
    const prisma = new PrismaClient();

    // clean up
    await prisma.role.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.user.deleteMany();
    await prisma.resource.deleteMany();

    // create a "view" permission and a "manage" permission
    const viewPerm = await prisma.permission.create({
        data: { name: 'view' },
    });
    const managePerm = await prisma.permission.create({
        data: { name: 'manage' },
    });

    // create a "manager" role and a "staff" role
    const managerRole = await prisma.role.create({
        data: {
            name: 'manager',
            permissions: { connect: [{ id: managePerm.id }] },
        },
    });
    const staffRole = await prisma.role.create({
        data: {
            name: 'staff',
            permissions: { connect: [{ id: viewPerm.id }] },
        },
    });

    // create two users, Emily (manager) and Adam (staff)
    // note that we need to make sure "roles.permissions" are included in the
    // returned result because they are used in the access rules
    const emily = await prisma.user.create({
        data: { name: 'Emily', roles: { connect: { id: managerRole.id } } },
        include: { roles: { include: { permissions: true } } },
    });
    const adam = await prisma.user.create({
        data: { name: 'Adam', roles: { connect: { id: staffRole.id } } },
        include: { roles: { include: { permissions: true } } },
    });

    // create an enhanced PrismaClient for each user
    const emilyDb = enhance(prisma, { user: emily }, { loadPath: '.zenstack' });
    const adamDb = enhance(prisma, { user: adam }, { loadPath: '.zenstack' });

    // Adam shouldn't be able to create a resource
    await expect(
        adamDb.resource.create({ data: { name: 'resource1' } })
    ).rejects.toThrow();

    // Emily should be able to create a resource
    const res = await emilyDb.resource.create({ data: { name: 'resource1' } });
    console.log('Resource created by Emily:', inspect(res));

    // Adam should be able to read the resource
    const resByAdam = await adamDb.resource.findUnique({
        where: { id: res.id },
    });
    console.log('Resource read by Adam:', inspect(resByAdam));
    expect(resByAdam).toBeTruthy();

    // Adam shouldn't be able to delete the resource
    await expect(
        adamDb.resource.delete({ where: { id: res.id } })
    ).rejects.toThrow();

    // Emily should be able to delete the resource
    await emilyDb.resource.delete({ where: { id: res.id } });
    console.log('Resource deleted by Emily');
});
