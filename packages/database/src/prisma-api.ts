import {Context, defaultContext} from './context'
import {v4} from 'uuid'
import {Prisma, Purchase, PurchaseUserTransferState, User} from '@prisma/client'

type SDKOptions = {ctx?: Context}

export function getSdk(
  {ctx = defaultContext}: SDKOptions = {ctx: defaultContext},
) {
  return {
    async getPurchaseDetails(purchaseId: string, userId: string) {
      const allPurchases = await ctx.prisma.purchase.findMany({
        where: {
          userId,
        },
        select: {
          id: true,
          productId: true,
        },
      })
      const purchase = await ctx.prisma.purchase.findFirst({
        where: {
          id: purchaseId as string,
          userId,
        },
        select: {
          id: true,
          merchantChargeId: true,
          createdAt: true,
          totalAmount: true,
          bulkCoupon: {
            select: {
              id: true,
              maxUses: true,
              usedCount: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          status: true,
        },
      })

      if (!purchase) {
        return {}
      }

      const availableUpgrades =
        purchase.status === 'Valid'
          ? await ctx.prisma.upgradableProducts.findMany({
              where: {
                AND: [
                  {
                    upgradableFromId: purchase?.product?.id,
                  },
                  {
                    NOT: {
                      upgradableToId: {
                        in: allPurchases.map(({productId}) => productId),
                      },
                    },
                  },
                ],
              },
              select: {
                upgradableTo: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            })
          : []

      const existingPurchase = await ctx.prisma.purchase.findFirst({
        where: {
          userId,
          productId: purchase?.product?.id,
          id: {
            not: purchaseId as string,
          },
          bulkCoupon: null,
          status: 'Valid',
        },
        select: {
          id: true,
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
      return {
        purchase,
        existingPurchase,
        availableUpgrades,
      }
    },
    async getPurchaseForStripeCharge(stripeChargeId: string) {
      return await ctx.prisma.purchase.findFirst({
        where: {
          merchantCharge: {
            identifier: stripeChargeId,
          },
        },
        include: {
          bulkCoupon: {
            include: {
              bulkCouponPurchases: true,
            },
          },
        },
      })
    },
    async updatePurchaseStatusForCharge(
      chargeId: string,
      status: 'Valid' | 'Refunded' | 'Disputed' | 'Banned',
    ): Promise<Purchase | undefined> {
      const purchase = await ctx.prisma.purchase.findFirst({
        where: {
          merchantCharge: {
            identifier: chargeId,
          },
        },
      })

      if (purchase) {
        return await ctx.prisma.purchase.update({
          where: {
            id: purchase.id,
          },
          data: {
            status: status,
          },
        })
      } else {
        throw new Error(`no-purchase-found-for-charge ${chargeId}`)
      }
    },
    async couponForIdOrCode({
      code,
      couponId,
    }: {
      code?: string
      couponId?: string
    }) {
      return await ctx.prisma.coupon.findFirst({
        where: {
          OR: [
            {
              OR: [{id: couponId}, {code}],
              expires: {
                gte: new Date(),
              },
            },
            {OR: [{id: couponId}, {code}], expires: null},
          ],
        },
        include: {
          merchantCoupon: true,
        },
      })
    },
    async availableUpgradesForProduct(purchases: any, productId: string) {
      return purchases
        ? await ctx.prisma.upgradableProducts.findMany({
            where: {
              upgradableFromId: {
                in: purchases.map(({productId}: Purchase) => productId),
              },
              upgradableToId: productId,
            },
            select: {
              upgradableTo: {
                select: {
                  id: true,
                  name: true,
                },
              },
              upgradableFrom: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          })
        : []
    },
    async completeLessonProgressForUser({
      userId,
      lessonId,
    }: {
      userId: string
      lessonId?: string
    }) {
      let lessonProgress = await ctx.prisma.lessonProgress.findFirst({
        where: {
          userId,
          lessonId,
        },
      })

      const now = new Date()

      if (lessonProgress) {
        lessonProgress = await ctx.prisma.lessonProgress.update({
          where: {id: lessonProgress.id},
          data: {
            completedAt: now,
            updatedAt: now,
          },
        })
      } else {
        lessonProgress = await ctx.prisma.lessonProgress.create({
          data: {
            userId,
            lessonId,
            completedAt: now,
            updatedAt: now,
          },
        })
      }
      return lessonProgress
    },
    async toggleLessonProgressForUser({
      userId,
      lessonSlug,
    }: {
      userId: string
      lessonSlug: string
    }) {
      let lessonProgress = await ctx.prisma.lessonProgress.findFirst({
        where: {
          userId,
          lessonSlug,
        },
      })

      const now = new Date()

      if (lessonProgress) {
        if (lessonProgress.completedAt) {
          lessonProgress = await ctx.prisma.lessonProgress.update({
            where: {id: lessonProgress.id},
            data: {
              completedAt: null,
              updatedAt: now,
            },
          })
        } else {
          lessonProgress = await ctx.prisma.lessonProgress.update({
            where: {id: lessonProgress.id},
            data: {
              completedAt: now,
              updatedAt: now,
            },
          })
        }
      } else {
        lessonProgress = await ctx.prisma.lessonProgress.create({
          data: {
            userId,
            lessonSlug,
            completedAt: now,
            updatedAt: now,
          },
        })
      }
      return lessonProgress
    },
    async getLessonProgressForUser(userId: string) {
      const userProgress = await ctx.prisma.user.findFirst({
        where: {id: userId as string},
        include: {
          lessonProgresses: {
            orderBy: {
              updatedAt: 'desc',
            },
          },
        },
      })
      return userProgress?.lessonProgresses
    },
    async getPurchaseWithUser(purchaseId: string) {
      return await ctx.prisma.purchase.findFirst({
        where: {id: purchaseId as string, status: 'Valid'},
        include: {
          user: true,
        },
      })
    },
    async getCouponWithBulkPurchases(couponId: string) {
      return await ctx.prisma.coupon.findFirst({
        where: {id: couponId},
        include: {bulkCouponPurchases: {select: {bulkCouponId: true}}},
      })
    },
    async getPurchase(args: Prisma.PurchaseFindUniqueArgs) {
      return await ctx.prisma.purchase.findUnique(args)
    },
    async getPurchasesForUser(userId?: string) {
      const purchases = userId
        ? await ctx.prisma.purchase.findMany({
            orderBy: {
              createdAt: 'asc',
            },
            where: {
              userId,
              status: {
                in: ['Valid', 'Refunded'],
              },
            },
            select: {
              id: true,
              status: true,
              merchantChargeId: true,
              productId: true,
              createdAt: true,
              totalAmount: true,
              bulkCoupon: {
                select: {
                  id: true,
                  maxUses: true,
                  usedCount: true,
                },
              },
              redeemedBulkCouponId: true,
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          })
        : []

      return purchases
    },
    async getMerchantProduct(stripeProductId: string) {
      return ctx.prisma.merchantProduct.findFirst({
        where: {
          identifier: stripeProductId,
        },
      })
    },
    async createMerchantChargeAndPurchase(options: {
      userId: string
      productId: string
      stripeChargeId: string
      merchantAccountId: string
      merchantProductId: string
      merchantCustomerId: string
      stripeChargeAmount: number
      quantity?: number
      bulk?: boolean
    }) {
      const {
        userId,
        stripeChargeId,
        merchantAccountId,
        merchantProductId,
        merchantCustomerId,
        productId,
        stripeChargeAmount,
        quantity = 1,
      } = options
      // we are using uuids so we can generate this!
      // this is needed because the following actions
      // are dependant
      const merchantChargeId = v4()
      const purchaseId = v4()

      const merchantCharge = ctx.prisma.merchantCharge.create({
        data: {
          id: merchantChargeId,
          userId,
          identifier: stripeChargeId,
          merchantAccountId,
          merchantProductId,
          merchantCustomerId,
        },
      })

      // if this user has already purchased this product, then an additional
      // purchase (even for only 1 seat) should be processed as a bulk
      // purchase so that they can distribute the seat to someone else.
      //
      // if an existingPurchase is found, but no existingBulkCoupon is found,
      // then the logic below will account for that and create a new bulk
      // coupon for the requested quantity.
      const existingPurchase = await ctx.prisma.purchase.findFirst({
        where: {
          productId,
          userId,
          status: 'Valid',
        },
      })

      // TODO: This doesn't seem to be looking up the bulk coupon based
      // on the product ID which will become an issue when any particular
      // app has more than one product.
      // E.g. should probably account for `restrictedToProductId`
      //
      // Check if this user has already purchased a bulk coupon, in which
      // case, we'll be able to treat this purchase as adding seats.
      //
      // TODO: I believe the `maxUses` check is redundant. If there is at
      // least one `bulkCouponPurchase` attached to this Coupon, then it is a
      // bulk coupon for this user.
      const existingBulkCoupon = await ctx.prisma.coupon.findFirst({
        where: {
          maxUses: {
            gt: 1,
          },
          bulkCouponPurchases: {
            some: {userId},
          },
        },
      })

      // Note: if the user already has a bulk purchase/coupon, then if they are
      // only adding 1 seat to the team, then it is still a "bulk purchase" and
      // we need to add it to their existing Bulk Coupon.
      const isBulkPurchase =
        quantity > 1 ||
        Boolean(existingBulkCoupon) ||
        options.bulk ||
        Boolean(existingPurchase)

      let bulkCouponId = null
      let coupon = null

      if (isBulkPurchase) {
        bulkCouponId =
          existingBulkCoupon !== null ? existingBulkCoupon.id : v4()

        // Create or Update Bulk Coupon Record
        if (existingBulkCoupon) {
          coupon = ctx.prisma.coupon.update({
            where: {
              id: existingBulkCoupon.id,
            },
            data: {
              maxUses: existingBulkCoupon.maxUses + quantity,
            },
          })
        } else {
          coupon = ctx.prisma.coupon.create({
            data: {
              id: bulkCouponId,
              restrictedToProductId: productId,
              maxUses: quantity,
              percentageDiscount: 1.0,
              status: 1,
            },
          })
        }
      }

      const purchase = ctx.prisma.purchase.create({
        data: {
          id: purchaseId,
          userId,
          productId,
          merchantChargeId,
          totalAmount: stripeChargeAmount / 100,
          bulkCouponId,
        },
      })

      const oneWeekInMilliseconds = 1000 * 60 * 60 * 24 * 7
      const purchaseUserTransfer = ctx.prisma.purchaseUserTransfer.create({
        data: {
          sourceUserId: userId,
          purchaseId: purchaseId,
          expiresAt: new Date(Date.now() + oneWeekInMilliseconds),
        },
      })

      if (coupon) {
        return await ctx.prisma.$transaction([
          purchase,
          merchantCharge,
          coupon,
          purchaseUserTransfer,
        ])
      } else {
        return await ctx.prisma.$transaction([
          purchase,
          merchantCharge,
          purchaseUserTransfer,
        ])
      }
    },
    async findOrCreateMerchantCustomer({
      user,
      identifier,
      merchantAccountId,
    }: {
      user: User
      identifier: string
      merchantAccountId: string
    }) {
      let merchantCustomer = await ctx.prisma.merchantCustomer.findUnique({
        where: {
          identifier,
        },
      })

      if (!merchantCustomer) {
        merchantCustomer = await ctx.prisma.merchantCustomer.create({
          data: {
            userId: user.id,
            identifier,
            merchantAccountId,
          },
        })
      }

      return merchantCustomer
    },
    async findOrCreateUser(email: string, name?: string | null) {
      let isNewUser = false
      let user = await ctx.prisma.user.findFirst({
        where: {
          email,
        },
      })

      if (!user) {
        isNewUser = true
        user = await ctx.prisma.user.create({
          data: {email, name},
        })
      } else if (name && user.name !== name) {
        user = await ctx.prisma.user.update({
          where: {id: user.id},
          data: {name},
        })
      }

      return {user, isNewUser}
    },
    async getUserByEmail(email: string) {
      const user = await ctx.prisma.user.findUnique({
        where: {
          email,
        },
      })

      return user
    },
    async getUserById(options: Prisma.UserFindUniqueArgs) {
      const user = await ctx.prisma.user.findUnique(options)
      return user
    },
    async getProduct(options: Prisma.ProductFindFirstArgs) {
      const product = await ctx.prisma.product.findFirst(options)
      return product
    },
    async getPrice(options: Prisma.PriceFindFirstArgs) {
      const price = await ctx.prisma.price.findFirst(options)
      return price
    },
    async getMerchantCoupon(options: Prisma.MerchantCouponFindFirstArgs) {
      const merchantCoupon = await ctx.prisma.merchantCoupon.findFirst(options)
      return merchantCoupon
    },
    async getCoupon(options: Prisma.CouponFindFirstArgs) {
      const coupon = await ctx.prisma.coupon.findFirst(options)
      return coupon
    },
    async getMerchantCoupons(options: Prisma.MerchantCouponFindManyArgs) {
      const merchantCoupons = await ctx.prisma.merchantCoupon.findMany(options)
      return merchantCoupons
    },
    async getDefaultCoupon(productId?: string) {
      const activeSaleCoupon = await ctx.prisma.coupon.findFirst({
        where: {
          default: true,
          expires: {
            gte: new Date(),
          },
        },
        include: {
          merchantCoupon: true,
        },
      })
      if (activeSaleCoupon) {
        const {restrictedToProductId} = activeSaleCoupon
        const validForProductId = restrictedToProductId
          ? restrictedToProductId === productId
          : true

        const {merchantCoupon: defaultMerchantCoupon, ...defaultCoupon} =
          activeSaleCoupon

        if (validForProductId) return {defaultMerchantCoupon, defaultCoupon}
      }
    },
    async transferPurchasesToNewUser({
      merchantCustomerId,
      userId,
    }: {
      merchantCustomerId: string
      userId: string
    }) {
      const chargesToUpdate = await ctx.prisma.merchantCharge.findMany({
        where: {
          merchantCustomerId: merchantCustomerId,
        },
      })

      const chargeUpdates = ctx.prisma.merchantCharge.updateMany({
        where: {
          merchantCustomerId: merchantCustomerId,
        },
        data: {
          userId: userId,
        },
      })

      const purchaseUpdates = ctx.prisma.purchase.updateMany({
        where: {
          merchantChargeId: {
            in: chargesToUpdate.map((c) => c.id),
          },
        },
        data: {
          userId: userId,
        },
      })

      return await ctx.prisma.$transaction([chargeUpdates, purchaseUpdates])
    },
    async createPurchaseUserTransfer({
      sourceUserId,
      purchaseId,
    }: {
      sourceUserId: string
      purchaseId: string
    }) {
      const purchase = await ctx.prisma.purchase.findFirst({
        where: {
          id: purchaseId,
          userId: sourceUserId,
        },
      })
      return (
        purchase &&
        (await ctx.prisma.purchaseUserTransfer.create({
          data: {
            sourceUserId,
            purchaseId: purchase.id,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          },
        }))
      )
    },
    async getPurchaseUserTransferById({id}: {id: string}) {
      return await ctx.prisma.purchaseUserTransfer.findUnique({
        where: {
          id,
        },
        include: {
          sourceUser: true,
          targetUser: true,
          purchase: true,
        },
      })
    },
    async updatePurchaseUserTransferTransferState({
      id,
      transferState,
    }: {
      id: string
      transferState: PurchaseUserTransferState
    }) {
      return await ctx.prisma.purchaseUserTransfer.update({
        where: {
          id,
        },
        data: {
          transferState,
        },
      })
    },
  }
}
