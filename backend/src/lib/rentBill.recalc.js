const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()


//this function is the automatic bookkeeper that keeps your RentBill status in sync with its Payment records.

async function recalcRentBillPaidStatus(rentBillId) {
    const [bill, agg] = await Promise.all([
        prisma.rentBill.findUnique({ where: { id: rentBillId }, select: { amount: true } }),
        prisma.payment.aggregate({ where: { rentBillId }, _sum: { amount: true } })
    ])


    if (!bill) throw new Error('RentBill not found')


    const totalPaid = agg._sum.amount ?? 0
    const fullyPaid = totalPaid >= bill.amount


    await prisma.rentBill.update({
        where: { id: rentBillId },
        data: { paid: fullyPaid }
    })


    return { totalPaid, billAmount: bill.amount, fullyPaid }
}


module.exports = { recalcRentBillPaidStatus }