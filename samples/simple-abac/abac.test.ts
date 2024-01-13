import { enhance } from '@zenstackhq/runtime';
import { inspect } from 'util';
import { PrismaClient } from './.prisma/client';

it('ABAC test', async () => {
    const prisma = new PrismaClient();

    // clean up
    await prisma.user.deleteMany();

    // create two users
    const emily = await prisma.user.create({
        data: { name: 'Emily', reputation: 100 },
    });
    const adam = await prisma.user.create({
        data: { name: 'Adam', reputation: 5 },
    });

    // create an enhanced PrismaClient for each user
    const emilyDb = enhance(prisma, { user: emily }, { loadPath: '.zenstack' });
    const adamDb = enhance(prisma, { user: adam }, { loadPath: '.zenstack' });

    // Emily can create a resource because she has enough reputation
    const res = await emilyDb.resource.create({
        data: { name: 'resource1', owner: { connect: { id: emily.id } } },
    });
    console.log('Resource created by Emily:', inspect(res));

    // Adam can't create a resource because he has insufficient reputation
    await expect(
        adamDb.resource.create({
            data: { name: 'resource2', owner: { connect: { id: adam.id } } },
        })
    ).rejects.toThrow();

    // Adam shouldn't see the resource because it's not published
    let allResourcesByAdam = await adamDb.resource.findMany();
    console.log('All resources read by Adam:', inspect(allResourcesByAdam));
    expect(allResourcesByAdam).toHaveLength(0);

    // Emily should be able to publish the resource
    await emilyDb.resource.update({
        where: { id: res.id },
        data: { published: true },
    });
    console.log('Resource published by Emily');

    // Adam should now be able to see the resource
    allResourcesByAdam = await adamDb.resource.findMany();
    console.log('All resources read by Adam:', inspect(allResourcesByAdam));
    expect(allResourcesByAdam).toHaveLength(1);
});
