import { enhance } from '@zenstackhq/runtime';
import { inspect } from 'util';
import { PrismaClient } from './.prisma/client';

it('ACL test', async () => {
    const prisma = new PrismaClient();

    // clean up
    await prisma.user.deleteMany();

    // create two users
    const emily = await prisma.user.create({
        data: { name: 'Emily' },
    });
    const adam = await prisma.user.create({
        data: { name: 'Adam' },
    });

    // create an enhanced PrismaClient for each user
    const emilyDb = enhance(prisma, { user: emily }, { loadPath: '.zenstack' });
    const adamDb = enhance(prisma, { user: adam }, { loadPath: '.zenstack' });

    // create a resource with Emily's identity
    const res = await emilyDb.resource.create({
        data: { name: 'resource1', owner: { connect: { id: emily.id } } },
    });
    console.log('Resource created by Emily:', inspect(res));

    // Adam shouldn't see the resource because he's not in the ACL
    let allResourcesByAdam = await adamDb.resource.findMany();
    console.log('All resources read by Adam:', inspect(allResourcesByAdam));
    expect(allResourcesByAdam).toHaveLength(0);

    // Emily should be able to add Adam to the ACL
    await emilyDb.resource.update({
        where: { id: res.id },
        data: {
            access: {
                create: { user: { connect: { id: adam.id } }, view: true },
            },
        },
    });
    console.log('Resource access granted to Adam with view access');

    // Adam should now be able to see the resource
    allResourcesByAdam = await adamDb.resource.findMany();
    console.log('All resources read by Adam:', inspect(allResourcesByAdam));
    expect(allResourcesByAdam).toHaveLength(1);

    // Adam shouldn't be able to update the resource
    await expect(
        adamDb.resource.update({
            where: { id: res.id },
            data: { name: 'resource2' },
        })
    ).rejects.toThrow();
});
