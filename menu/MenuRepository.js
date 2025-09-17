import SqlString from 'sequelize/lib/sql-string';
import { MenuCategory } from '../../models/menu/MenuCategoriesModel';
import { MenuItem } from '../../models/menu/MenuItemModel';
import { Menus } from '../../models/menu/MenuModel';
import { MenuItemVariation } from '../../models/menu/MenuItemVariation';
import { SideCategory } from '../../models/menu/sides/Sides';
import { SideItems } from '../../models/menu/sides/SideItems';
import { MenuItemSides } from '../../models/menu/MenuItemSides';
import { ReportingCategory } from '../../models/menu/ReportingCategory';
import { Op, Sequelize, QueryTypes } from 'sequelize';
import { ItemAllergies } from '../../models/menu/ItemAllergies';
import { ItemSubstitutions } from '../../models/menu/ItemSubstitutions';
import { ItemAdditions } from '../../models/menu/ItemAdditions';
import { ItemToppings } from '../../models/menu/ItemToppings';
import { PartnerTaxes } from '../../models/partner/PartnerTaxes';
import { TaxType } from '../../models/master/TaxType';
import { OrderItemToppings } from '../../models/order/OrderItemToppings';
import { PartnerPrinter } from '../../models/partner/PartnerPrinter';
import { Partner } from '../../models/partner/Partner';
import { menuAvailability } from '../../models/menu/availableMenus';
import { PartnerRepository } from '../partner/PartnerRepository';
import { auroraDelay, delay } from '../../core/utility/Helper';
import Logger from '@cheqplease/structured-logger';
import { PaymentPromotions } from '../../models/payment/PaymentPromotions';
import { PaymentTypes } from '../../models/payment/PaymentTypes';
import {
    menuQuery,
    printersQuery,
    reportingCategoriesQuery,
    sidesQuery,
} from './menuExportQueries';
import { CustomError, InternalServerError } from '../../modules/httpStatus';
import { ItemComponents } from '../../models/menu/itemComponents';
import { ItemContainers } from '../../models/menu/ItemContainers';
import { ContainerTemplateModel } from '../../modules/menuTemplates/models/containerTemplate.model';
import { RestaurantGroupRepo } from '../restaurantGroup/RestaurantGroupRepo';

export class MenuRepository {
    constructor() {
        if (MenuRepository.instance) return MenuRepository.instance;

        this.partnerRepo = new PartnerRepository();
        this.restaurantGroupRepo = new RestaurantGroupRepo();
        this.logger = new Logger(this);
        MenuRepository.instance = this;
    }

    async posMenuQueryOption(partnerId, device, condition, menuId = null) {
        let orderBy = [
            ['posSortingIndex', 'ASC'],
            ['id', 'DESC'],
        ];
        condition = {
            partner_id: partnerId,
        };

        if (menuId) {
            condition.id = menuId;
        }

        if (!device) {
            condition.isActive = true;
        }

        return {
            orderBy,
            condition,
        };
    }
    async findMenuByPartnerId(partnerId, device) {
        this.logger.info({
            message: 'Start executing method',
            context: this.findMenuByPartnerId.name,
        });
        let orderBy = [
            ['sortingIndex', 'ASC'],
            ['id', 'DESC'],
        ];
        let condition = { partner_id: partnerId };
        if (device && device === 'pos') {
            const queryOption = await this.posMenuQueryOption(partnerId, device, condition);
            condition = queryOption.condition;
            orderBy = queryOption.orderBy;
        }

        const partnerGroup = await this.restaurantGroupRepo.getActivePartnerGroupByPartnerId(
            partnerId,
        );

        return Menus.findAll({
            include: [
                {
                    model: menuAvailability,
                    as: 'availabilitesInfo',
                    attributes: {
                        exclude: ['menuId', 'menu_id'],
                    },
                },
                {
                    model: MenuCategory,
                    as: 'menuCategories',
                    attributes: {
                        exclude: ['menuId', 'menu_id'],
                    },
                    separate: true,
                    order: orderBy,
                    include: [
                        {
                            model: MenuItem,
                            as: 'menuItems',
                            attributes: {
                                include: [
                                    [
                                        Sequelize.literal('"' + partnerGroup?.weightUnit + '"'),
                                        'weightUnit',
                                    ],
                                ],
                                exclude: [
                                    'applicableTaxes',
                                    'description',
                                    'itemCalories',
                                    'enableSpecialInstructions',
                                    'taxId',
                                ],
                            },
                            where: { isArchived: false },
                            include: [
                                {
                                    model: ItemContainers,
                                    as: 'itemContainers',
                                    attributes: {
                                        include: [
                                            [
                                                Sequelize.literal(
                                                    '"' + partnerGroup?.weightUnit + '"',
                                                ),
                                                'weightUnit',
                                            ],
                                        ],
                                        exclude: [
                                            'itemId',
                                            'item_id',
                                            'templateId',
                                            'createdAt',
                                            'updatedAt',
                                            'deletedAt',
                                        ],
                                    },
                                },
                            ],
                            separate: true,
                            order: orderBy,
                        },
                    ],
                },
            ],
            where: condition,
            attributes: {
                exclude: ['partnerId', 'partner_id'],
            },
            //order: [["id", "ASC"], [Sequelize.col(`menuCategories.id`), "ASC"], [Sequelize.col(`menuCategories.menuItems.id`), "ASC"]]
            order: orderBy,
        });
    }

    async findMenuItemSide(id) {
        return SideItems.findOne({
            where: { id },
        });
    }

    async findMenuItemSubtitutions(id) {
        return ItemSubstitutions.findOne({
            where: { id },
        });
    }

    async findMenuItemToppings(id) {
        return ItemToppings.findOne({
            where: { id },
        });
    }

    async findOrderItemToppings(item_topping_id) {
        return OrderItemToppings.findOne({
            where: { item_topping_id },
            include: [
                {
                    model: ItemToppings,
                    as: 'itemToppings',
                    attributes: ['toppingName'],
                },
            ],
        });
    }

    async findMenuItemAdditions(id) {
        return ItemAdditions.findOne({
            where: { id },
        });
    }

    async findMenuItemAllergies(id) {
        return ItemAllergies.findOne({
            where: { id },
        });
    }
    async findMenuItemVariant(id) {
        return MenuItemVariation.findOne({
            where: { id },
        });
    }
    async findMenuItem(itemId) {
        this.logger.info({
            message: 'Start executing method',
            context: this.findMenuItem.name,
            data: { itemId },
        });
        const item = await MenuItem.findOne({
            include: [
                {
                    model: PartnerTaxes,
                    attributes: {
                        exclude: ['partnerId', 'taxType', 'partner_id'],
                    },
                    as: 'taxTypes',
                    include: [
                        {
                            model: TaxType,
                            as: 'taxTypes',
                        },
                    ],
                },
                {
                    model: MenuItemSides,
                    as: 'menuItemSides',
                    attributes: {
                        exclude: ['itemId', 'item_id'],
                    },
                    order: [['id', 'ASC']],
                    include: [
                        {
                            model: SideCategory,
                            as: 'sideCategory',
                            attributes: {
                                exclude: ['partnerId', 'partner_id'],
                            },
                            order: [['id', 'ASC']],
                        },
                    ],
                },
                {
                    model: ItemAllergies,
                    as: 'itemAllergies',
                    attributes: {
                        exclude: ['itemId', 'item_id'],
                    },
                    order: [['id', 'ASC']],
                },
                {
                    model: ItemAdditions,
                    as: 'itemAdditions',
                    attributes: {
                        exclude: ['itemId', 'item_id'],
                    },
                    order: [['id', 'ASC']],
                },
                {
                    model: ItemSubstitutions,
                    as: 'itemSubstitutions',
                    attributes: {
                        exclude: ['itemId', 'item_id'],
                    },
                    order: [['id', 'ASC']],
                },
                {
                    model: ItemToppings,
                    as: 'itemToppings',
                    attributes: {
                        exclude: ['itemId', 'item_id'],
                    },
                    order: [['id', 'ASC']],
                },
                {
                    model: MenuItemVariation,
                    as: 'menuItemVariations',
                    attributes: {
                        include: [
                            [
                                Sequelize.literal(
                                    `(CASE menuItemVariations.is_delta WHEN 1 THEN (item_calories+menuItemVariations.calories) ELSE menuItemVariations.calories END)`,
                                ),
                                'calories',
                            ],
                        ],
                        exclude: ['itemId', 'item_id'],
                    },
                    order: [['id', 'ASC']],
                },
                {
                    model: MenuCategory,
                    as: 'itemCategory',
                    attributes: {
                        exclude: [
                            'id',
                            'menuId',
                            'description',
                            'takeoutAvailable',
                            'isActive',
                            'sortingIndex',
                            'menu_id',
                        ],
                    },
                },
            ],
            where: { id: itemId },
            attributes: { exclude: ['category_id'] },
            order: [
                ['id', 'ASC'],
                [Sequelize.col(`itemToppings.id`), 'ASC'],
                [Sequelize.col(`menuItemSides.id`), 'ASC'],
                [Sequelize.col(`itemSubstitutions.id`), 'ASC'],
                [Sequelize.col(`itemAllergies.id`), 'ASC'],
                [Sequelize.col(`menuItemVariations.id`), 'ASC'],
                [Sequelize.col(`itemAdditions.id`), 'ASC'],
            ],
        });

        if (item?.printerId) {
            const printer = await PartnerPrinter.findOne({
                where: { id: item.printerId },
            });
            if (printer && printer.dataValues) {
                item.dataValues.printer = printer.dataValues;
            }
        }

        return item;
    }

    async findMenuItemApp(itemId) {
        this.logger.info({
            message: 'Start executing method',
            context: this.findMenuItemApp.name,
        });
        return MenuItem.findOne({
            include: [
                {
                    model: MenuCategory,
                    as: 'itemCategory',
                    attributes: {
                        include: ['takeoutAvailable'],
                        exclude: ['createdAt', 'updatedAt', 'deletedAt'],
                    },
                },
                {
                    model: PartnerTaxes,
                    attributes: {
                        exclude: ['partnerId', 'taxType', 'partner_id', 'createdAt', 'updatedAt'],
                    },
                    as: 'taxTypes',
                    include: [
                        {
                            model: TaxType,
                            as: 'taxTypes',
                            attributes: {
                                exclude: ['createdAt', 'updatedAt'],
                            },
                        },
                    ],
                },
                {
                    model: MenuItemSides,
                    as: 'menuItemSides',
                    attributes: {
                        exclude: ['itemId', 'item_id', 'createdAt', 'updatedAt', 'deletedAt'],
                    },
                    order: [['id', 'ASC']],
                    include: [
                        {
                            model: SideCategory,
                            as: 'sideCategory',
                            attributes: {
                                exclude: [
                                    'partnerId',
                                    'partner_id',
                                    'createdAt',
                                    'updatedAt',
                                    'deletedAt',
                                ],
                            },
                            order: [['id', 'ASC']],
                        },
                    ],
                },
                {
                    model: ItemAllergies,
                    as: 'itemAllergies',
                    attributes: {
                        exclude: ['itemId', 'item_id', 'createdAt', 'updatedAt', 'deletedAt'],
                    },
                    order: [['id', 'ASC']],
                    where: {
                        enableAllergy: true,
                    },
                    required: false,
                },
                {
                    model: ItemAdditions,
                    as: 'itemAdditions',
                    attributes: {
                        exclude: ['itemId', 'item_id', 'createdAt', 'updatedAt', 'deletedAt'],
                    },
                    order: [['id', 'ASC']],
                    where: {
                        enableAddition: true,
                    },
                    required: false,
                },
                {
                    model: ItemSubstitutions,
                    as: 'itemSubstitutions',
                    attributes: {
                        exclude: ['itemId', 'item_id', 'createdAt', 'updatedAt', 'deletedAt'],
                    },
                    order: [['id', 'ASC']],
                    where: {
                        enableSubstitution: true,
                    },
                    required: false,
                },
                {
                    model: ItemToppings,
                    as: 'itemToppings',
                    attributes: {
                        exclude: ['itemId', 'item_id', 'createdAt', 'updatedAt', 'deletedAt'],
                    },
                    order: [['id', 'ASC']],
                    where: {
                        enableTopping: true,
                    },
                    required: false,
                },
                {
                    model: MenuItemVariation,
                    as: 'menuItemVariations',
                    attributes: {
                        include: [
                            [
                                Sequelize.literal(
                                    `(CASE menuItemVariations.is_delta WHEN 1 THEN (item_calories+menuItemVariations.calories) ELSE menuItemVariations.calories END)`,
                                ),
                                'calories',
                            ],
                        ],
                        exclude: ['itemId', 'item_id', 'createdAt', 'updatedAt', 'deletedAt'],
                    },
                    order: [['id', 'ASC']],
                },
                {
                    model: MenuCategory,
                    as: 'itemCategory',
                    attributes: {
                        exclude: [
                            'id',
                            'menuId',
                            'description',
                            'takeoutAvailable',
                            'isActive',
                            'sortingIndex',
                            'menu_id',
                            'createAd',
                            'updatedAt',
                            'deletedAt',
                        ],
                    },
                },
                {
                    model: PaymentPromotions,
                    as: 'paymentPromotions',
                    where: { isActive: true },
                    attributes: {
                        exclude: [
                            'createdAt',
                            'updatedAt',
                            'deletedAt',
                            'payment',
                            'item_id',
                            'partner_id',
                        ],
                    },
                    include: [
                        {
                            model: PaymentTypes,
                            as: 'paymentTypeInfo',
                            attributes: ['id', 'name', 'type'],
                        },
                    ],
                    required: false,
                },
            ],
            where: { id: itemId },
            attributes: {
                exclude: [
                    'category_id',
                    'takeoutAvailable',
                    'createdAt',
                    'updatedAt',
                    'deletedAt',
                    'reporting_category_id',
                ],
            },
            order: [
                ['id', 'ASC'],
                [Sequelize.col(`itemToppings.id`), 'ASC'],
                [Sequelize.col(`menuItemSides.id`), 'ASC'],
                [Sequelize.col(`itemSubstitutions.id`), 'ASC'],
                [Sequelize.col(`itemAllergies.id`), 'ASC'],
                [Sequelize.col(`menuItemVariations.id`), 'ASC'],
                [Sequelize.col(`itemAdditions.id`), 'ASC'],
            ],
        });
    }

    async getAllMenuItems({ partnerId }) {
        this.logger.info({
            message: 'Start executing getAllMenuItems',
            context: this.getAllMenuItems.name,
            data: {
                partnerId,
            },
        });

        const menus = await Menus.findAll({
            where: { partnerId },
            include: [
                {
                    model: MenuCategory,
                    as: 'menuCategories',
                    attributes: ['id'],
                    include: [
                        {
                            model: MenuItem,
                            as: 'menuItems',
                            attributes: ['id', 'name'],
                            where: { isArchived: false },
                        },
                    ],
                },
            ],
        });

        const menuItemsArray =
            menus
                ?.flat()
                ?.map((menu) => menu?.menuCategories)
                ?.flat()
                ?.map((category) => category?.menuItems)
                ?.flat() ?? [];

        return menuItemsArray;
    }

    async saveMenu(menu) {
        this.logger.info({
            message: 'Start executing method',
            context: this.saveMenu.name,
            data: {
                menu,
            },
        });
        return menu.id ? Menus.update(menu, { where: { id: menu.id } }) : Menus.create(menu);
    }

    async saveMenuAvailability(menuAvailabilityData) {
        this.logger.info({
            message: 'Start executing method',
            context: this.saveMenuAvailability.name,
            data: {
                menuAvailabilityData,
            },
        });
        try {
            for (const data of menuAvailabilityData) {
                if (data.menuAvailabilityId) {
                    await menuAvailability.update(data, {
                        where: { id: data.menuAvailabilityId },
                    });
                } else {
                    await menuAvailability.create(data);
                }
            }
        } catch (error) {
            this.logger.error({
                error,
                context: this.saveMenuAvailability.name,
            });
            throw error;
        }
    }

    async deleteMenuAvailability(menuAvailabityIds) {
        return menuAvailability.destroy({
            where: {
                id: { [Op.in]: menuAvailabityIds },
            },
        });
    }

    async deleteMenu(condition, transaction) {
        return Menus.destroy({ where: condition, transaction, individualHooks: true });
    }

    async saveCategory(category) {
        this.logger.info({
            message: 'Start executing method',
            context: this.saveCategory.name,
            data: {
                category,
            },
        });
        return category.id
            ? MenuCategory.update(category, {
                  where: { id: category.id },
              }).then(() => MenuCategory.findOne({ where: { id: category.id } }))
            : MenuCategory.create(category);
    }

    async deleteCategory(condition, transaction) {
        return MenuCategory.destroy({
            where: condition,
            transaction,
            individualHooks: true,
        });
    }

    async saveMenuItem(item, transaction) {
        this.logger.info({
            message: 'Start executing method',
            context: this.saveMenuItem.name,
            data: {
                item,
                transaction,
            },
        });
        return item.id
            ? MenuItem.update(item, {
                  where: { id: item.id },
                  transaction,
              }).then(async () => {
                  await delay(auroraDelay);
                  return MenuItem.findOne({
                      where: { id: item.id },
                      transaction,
                  });
              })
            : MenuItem.create(item, { transaction });
    }

    async enableDisableSkuSpecialInstructions(skuIds, enableSkuSpecialInstruction) {
        this.logger.info({
            message: 'Start executing method',
            context: this.enableDisableSkuSpecialInstructions.name,
            data: {
                skuIds,
                enableSkuSpecialInstruction,
            },
        });

        try {
            return await MenuItem.update(
                { enableSpecialInstructions: enableSkuSpecialInstruction },
                {
                    where: {
                        id: skuIds,
                    },
                },
            );
        } catch (error) {
            this.logger.error({
                message: 'Error updating menu items',
                context: this.enableDisableSkuSpecialInstructions.name,
                error: error.message,
            });
            throw error;
        }
    }

    async deleteMenuItem(condition, transaction) {
        return MenuItem.destroy({ where: condition, transaction, individualHooks: true });
    }

    async deleteMultipleMenuItem(condition, transaction) {
        return MenuItem.destroy({ where: condition, transaction, individualHooks: true });
    }

    async updateMenuItem(item) {
        return Menus.update(
            { isActive: item.isActive },
            { where: { partner_id: item.partnerid, id: item.menu_id } },
        );
    }

    async findSideCategoryById(id) {
        return SideCategory.findOne({ where: { id } });
    }

    async saveItemVariation(payload, transaction = null) {
        this.logger.info({
            message: 'Start executing method',
            context: this.saveItemVariation.name,
            data: {
                payload,
            },
        });
        const options = {
            updateOnDuplicate: ['name', 'calories', 'price', 'isDelta', 'isDefault', 'upc', 'sku'],
        };
        if (transaction) {
            options.transaction = transaction;
        }
        return MenuItemVariation.bulkCreate(payload, options);
    }

    async deleteItemVariation(variation) {
        this.logger.info({
            message: 'Start executing method',
            context: this.deleteItemVariation.name,
            data: {
                variation,
            },
        });
        return MenuItemVariation.destroy({ where: { id: variation.id }, individualHooks: true });
    }

    async deleteItemVariationWithTemplateId(templateId) {
        return MenuItemVariation.destroy({ where: { templateId }, individualHooks: true });
    }

    async updateVariationByTemplateId(data, templateId, transaction = null) {
        return MenuItemVariation.update(data, { where: { templateId }, transaction });
    }

    async createVariation(data, transaction = null) {
        return MenuItemVariation.create({ ...data }, { transaction });
    }

    async createContainerTemplate(data, transaction = null) {
        return ContainerTemplateModel.create({ ...data }, { transaction });
    }

    async updateContainerTemplateById(data, templateId, transaction = null) {
        return ContainerTemplateModel.update(data, { where: { id: templateId }, transaction });
    }

    async createItemContainer(data, transaction = null) {
        return ItemContainers.create({ ...data }, { transaction });
    }

    async saveItemContainers(payload, transaction = null) {
        this.logger.info({
            message: 'Start executing method',
            context: this.saveItemContainers.name,
            data: {
                payload,
            },
        });
        const options = {
            updateOnDuplicate: ['tareWeight', 'price', 'sku'],
        };
        if (transaction) {
            options.transaction = transaction;
        }
        return ItemContainers.bulkCreate(payload, options);
    }

    async updateItemContainerByTemplateId(data, templateId, transaction = null) {
        return ItemContainers.update(data, { where: { templateId }, transaction });
    }

    async deleteItemContainerByTemplateId(templateId) {
        return ItemContainers.destroy({ where: { templateId }, individualHooks: true });
    }

    async saveItemSides(item, transaction) {
        this.logger.info({
            message: 'Start executing method',
            context: this.saveItemSides.name,
            data: {
                item,
                transaction,
            },
        });
        if (item.id) {
            await MenuItemSides.destroy({
                where: { itemId: item.id },
                transaction,
                individualHooks: true,
            });
            await delay(auroraDelay);
        }
        return MenuItemSides.bulkCreate(item.sides, { transaction });
    }

    async saveSide(sides) {
        this.logger.info({
            message: 'Start executing method',
            context: this.saveSide.name,
            data: {
                sides,
            },
        });
        return sides.id
            ? SideCategory.update(sides, { where: { id: sides.id } }).then(async () => {
                  await delay(auroraDelay);
                  return SideCategory.findOne({ where: { id: sides.id } });
              })
            : SideCategory.create(sides);
    }

    async deleteSide(sides, transaction) {
        this.logger.info({
            message: 'Start executing method',
            context: this.deleteSide.name,
            data: {
                sides,
                transaction,
            },
        });
        await SideItems.destroy({
            where: { side_category_id: sides.id },
            transaction: transaction,
        });
        return SideCategory.destroy({
            where: { id: sides.id },
            transaction: transaction,
        });
    }

    async saveSideItem(sideItem) {
        this.logger.info({
            message: 'Start executing method',
            context: this.saveSideItem.name,
            data: {
                sideItem,
            },
        });
        return sideItem.id
            ? SideItems.update(sideItem, {
                  where: { id: sideItem.id },
              }).then(async () => {
                  await delay(auroraDelay);
                  return SideItems.findOne({ where: { id: sideItem.id } });
              })
            : SideItems.create(sideItem);
    }

    async deleteSideItem(sideItem) {
        this.logger.info({
            message: 'Start executing method',
            context: this.deleteSideItem.name,
            data: {
                sideItem,
            },
        });
        return SideItems.destroy({ where: { id: sideItem.id } });
    }

    async findMenuItemSides(sideCategoryId) {
        this.logger.info({
            message: 'Start executing method',
            context: this.findMenuItemSides.name,
        });
        return SideItems.findAll({
            where: { sideCategoryId },
            attributes: {
                exclude: ['side_category_id', 'side_customisation_id', 'customizationCategoryId'],
            },
            include: [
                {
                    model: SideCategory,
                    as: 'customizationCategory',
                    attributes: { exclude: ['partner_id', 'partnerId'] },
                },
                {
                    model: PartnerTaxes,
                    attributes: {
                        exclude: ['partnerId', 'taxType', 'partner_id'],
                    },
                    as: 'taxTypes',
                    include: [
                        {
                            model: TaxType,
                            as: 'taxTypes',
                        },
                    ],
                },
            ],
            order: [
                ['id', 'ASC'],
                [Sequelize.col(`customizationCategory.id`), 'ASC'],
                [Sequelize.col(`taxTypes.id`), 'ASC'],
            ],
        });
    }

    async countMenuItemSides(sideCategoryId) {
        return MenuItemSides.count({
            where: { sideCategoryId },
        });
    }

    async getMenuVariations(itemId) {
        return MenuItemVariation.findAll({ where: { itemId: itemId } });
    }

    async getMenuSides(partnerId) {
        return SideCategory.findAll({
            include: [
                {
                    model: SideItems,
                    as: 'sideItems',
                    include: [
                        {
                            model: PartnerTaxes,
                            attributes: {
                                exclude: ['partnerId', 'taxType', 'partner_id'],
                            },
                            as: 'taxTypes',
                            include: [
                                {
                                    model: TaxType,
                                    as: 'taxTypes',
                                },
                            ],
                        },
                    ],
                },
            ],
            where: { partner_id: partnerId },
            order: [
                ['id', 'ASC'],
                [Sequelize.col(`sideItems.id`), 'ASC'],
                [Sequelize.col(`sideItems.taxTypes.id`), 'ASC'],
            ],
        });
    }
    async updateCategoryOrder(category) {
        this.logger.info({
            message: 'Start executing method',
            context: this.updateCategoryOrder.name,
            data: {
                category,
            },
        });
        const columnToUpdate =
            typeof category[0]?.posSortingIndex === 'number' ? 'posSortingIndex' : 'sortingIndex';
        return MenuCategory.bulkCreate(category, {
            ignoreDuplicates: true,
            updateOnDuplicate: [columnToUpdate],
        });
    }
    async findCategory(condition, includeItems = false) {
        const querySpecs = {
            where: condition,
        };

        if (includeItems) {
            querySpecs['include'] = {
                model: MenuItem,
                as: 'menuItems',
            };
        }

        return MenuCategory.findOne(querySpecs);
    }

    async findMenuCategoryByCondition(condition) {
        const querySpecs = {
            where: condition,
        };
        return MenuCategory.findOne(querySpecs);
    }

    async findMenuItemOrder(condition) {
        return MenuItem.findOne({
            where: condition,
        });
    }
    async updateMenuItemOrder(menuItem) {
        this.logger.info({
            message: 'Start executing method',
            context: this.updateMenuItemOrder.name,
            data: {
                menuItem,
            },
        });
        const columnToUpdate =
            typeof menuItem[0]?.posSortingIndex === 'number' ? 'posSortingIndex' : 'sortingIndex';
        return MenuItem.bulkCreate(menuItem, {
            ignoreDuplicates: true,
            updateOnDuplicate: [columnToUpdate],
        });
    }

    async getMenuCustomer(condition) {
        this.logger.info({
            message: 'Start executing method',
            context: this.getMenuCustomer.name,
        });
        return Menus.findAll({
            include: [
                {
                    model: MenuCategory,
                    as: 'menuCategories',
                    attributes: {
                        exclude: [
                            'menuId',
                            'menu_id',
                            'name',
                            'description',
                            'takeoutAvailable',
                            'isActive',
                            'sortingIndex',
                        ],
                    },
                    include: [
                        {
                            model: MenuItem,
                            as: 'menuItems',
                            attributes: {
                                exclude: [
                                    'price',
                                    'category_id',
                                    'taxId',
                                    'applicableTaxes',
                                    'description',
                                    'categoryId',
                                    'categoryId',
                                    'itemImage',
                                    'itemCalories',
                                    'enableSpecialInstructions',
                                    'takeoutAvailable',
                                    'sortingIndex',
                                ],
                            },
                        },
                    ],
                },
            ],
            where: condition,
            attributes: {
                exclude: ['partnerId', 'partner_id', 'partnerName'],
            },
        });
    }

    async bulkMenuUpdate(menus) {
        this.logger.info({
            message: 'Start executing method',
            context: this.bulkMenuUpdate.name,
            data: {
                menus,
            },
        });
        return Menus.bulkCreate(menus, {
            ignoreDuplicates: true,
            updateOnDuplicate: ['isActive'],
        });
    }

    async bulkMenuItemUpdate(menuItems) {
        this.logger.info({
            message: 'Start executing method',
            context: this.bulkMenuItemUpdate.name,
            data: {
                menuItems,
            },
        });
        return MenuItem.bulkCreate(menuItems, {
            ignoreDuplicates: true,
            updateOnDuplicate: ['isActive'],
        });
    }

    /**
     * @param {{
     * partnerId: number,
     * partnerGroupId: number,
     * menuId: number,
     * checkPartnerGroup?: boolean,
     * partnerIds: number[]
     * }} params
     */
    async isMenuPresentForPartner({
        partnerId,
        partnerGroupId,
        menuId,
        checkPartnerGroup = false,
        partnerIds = [],
    }) {
        const querySpecs = {
            where: {
                id: menuId,
                partnerId,
            },
        };

        if (checkPartnerGroup) {
            if (partnerIds.length) {
                querySpecs.where.partnerId = { [Op.in]: partnerIds };
            } else if (partnerGroupId) {
                querySpecs.where.partnerId = {
                    [Op.in]: Sequelize.literal(`(
                      SELECT partner_id
                      FROM mercuri.partner_group_map pgm
                      WHERE pgm.partner_group_id = ${partnerGroupId}
                      AND pgm.status = 'approved'
                    )`),
                };
            }
        }

        return Menus.count(querySpecs);
    }

    async isMenuItemSkuPresentForPartner(partnerId, itemSKU, itemId = null) {
        let countReturn = 0;
        const isMenuItem = await MenuItem.findAndCountAll({
            include: [
                {
                    model: MenuCategory,
                    as: 'itemCategory',
                    attributes: [['menu_id', 'menuId']],
                },
            ],
            attributes: [],
            where: {
                itemSKU,
                id: {
                    [Op.not]: itemId,
                },
            },
        });
        const { count, rows } = isMenuItem;
        if (count) {
            const menuId = rows[0]?.itemCategory?.menuId;
            countReturn = await this.isMenuPresentForPartner({
                partnerId,
                menuId,
            });
        }
        return countReturn;
    }

    async isMenuSideItemSkuPresentForPartner(partnerId, sideItemSKU, sideItemId = null) {
        let hasSku = false;
        const isSideItem = await SideItems.findAndCountAll({
            include: [
                {
                    model: SideCategory,
                    as: 'customizationCategory',
                    attributes: ['partnerId'],
                },
            ],
            attributes: [],
            where: {
                sideItemSKU,
                id: {
                    [Op.not]: sideItemId,
                },
            },
        });

        // check for menuId present for partner
        const { count, rows } = isSideItem;
        if (count) {
            const id = rows[0]?.customizationCategory?.partnerId;
            hasSku = partnerId === id;
        }
        return hasSku;
    }

    async isMenuItemPresentForPartner(partnerId, menuItemId, partnerGroupId = null) {
        let countReturn = 0;
        const isMenuItem = await MenuItem.findAndCountAll({
            include: [
                {
                    model: MenuCategory,
                    as: 'itemCategory',
                    attributes: [['menu_id', 'menuId']],
                },
            ],
            attributes: [],
            where: { id: menuItemId },
        });

        // check for menuId present for partner
        const { count, rows } = isMenuItem;
        if (count) {
            const menuId = rows[0]?.itemCategory?.menuId;
            const payload = { partnerId, menuId };
            if (partnerGroupId) {
                payload['checkPartnerGroup'] = true;
                payload['partnerGroupId'] = partnerGroupId;
            }
            countReturn = await this.isMenuPresentForPartner(payload);
        }
        return countReturn;
    }

    async isSideCategoryPresentForPartner(partnerId, sideCategoryId) {
        return SideCategory.count({
            attributes: [],
            where: {
                partnerId: partnerId,
                id: sideCategoryId,
            },
        });
    }

    async isMenuCategoryPresentForPartner(partnerId, menuCategoryId) {
        return Menus.count({
            include: [
                {
                    model: MenuCategory,
                    as: 'menuCategories',
                    attributes: [],
                    where: { id: menuCategoryId },
                },
            ],
            attributes: [],
            where: { partnerId },
        });
    }

    async findMenuById(id, includeCategory = false) {
        const querySpecs = {
            where: { id },
        };

        if (includeCategory) {
            querySpecs['include'] = {
                model: MenuCategory,
                as: 'menuCategories',
            };
        }

        return Menus.findOne(querySpecs);
    }

    async findMenuByCondition(condition) {
        const querySpecs = {
            where: condition,
        };
        return Menus.findOne(querySpecs);
    }

    async findMenuWithAvailabilities(id) {
        return Menus.findOne({
            where: { id },
            attributes: {
                exclude: ['partnerId', 'partner_id'],
            },
            include: [
                {
                    model: menuAvailability,
                    as: 'availabilitesInfo',
                    attributes: {
                        exclude: ['menuId', 'menu_id'],
                    },
                },
            ],
        });
    }

    async getMenusByPartnerId(partnerId) {
        return Menus.findAll({
            where: {
                partner_id: partnerId,
                sorting_index: { [Op.ne]: null },
            },
            order: [
                ['sortingIndex', 'ASC'],
                ['id', 'DESC'],
            ],
        });
    }

    getPartnerMenuList(partnerId, attr = []) {
        return Menus.findAndCountAll({
            where: {
                partnerId,
                isActive: true,
            },
            attributes: attr.length ? attr : ['id', 'menuName'],
            order: [
                ['sortingIndex', 'ASC'],
                ['id', 'DESC'],
            ],
        });
    }

    async getCategoryWiseMenusItemSidesCountByItemId(itemId, required = false) {
        return MenuItemSides.findAll({
            attributes: [
                'sideCategoryId',
                [Sequelize.fn('count', Sequelize.col('required')), 'count'],
            ],
            where: { itemId, required },
            group: ['sideCategoryId'],
        });
    }

    async getMenuItemByIds(menuIds) {
        if (menuIds.length) {
            return MenuItem.findAll({
                where: {
                    id: { [Op.in]: menuIds },
                },
            });
        }
        return [];
    }

    async menuJsonExport(partnerId, groupId) {
        const sides = await MenuItem.sequelize.query(sidesQuery(), {
            replacements: { partnerId },
        });
        const menu = await MenuItem.sequelize.query(menuQuery(), {
            replacements: { partnerId },
        });
        const printers = await PartnerPrinter.sequelize.query(printersQuery(), {
            replacements: { partnerId },
        });

        const reportingCategories = groupId
            ? await PartnerPrinter.sequelize.query(reportingCategoriesQuery(), {
                  replacements: { groupId, partnerId },
              })
            : [[]];

        return {
            side_categories: sides[0],
            menu: menu[0],
            printers: printers[0],
            reporting_categories: reportingCategories[0],
        };
    }

    async bulkMenuUpload({
        menuData = [],
        sideCategories = [],
        printers = [],
        reportingCategories = [],
        partnerId = null,
        groupId = null,
    }) {
        try {
            this.logger.info({
                message: 'Start executing method',
                context: this.bulkMenuUpload.name,
                data: {
                    partnerId,
                },
            });
            const sourcePartnerId = menuData?.[0]?.partner_id;
            const partner = await Partner.findOne({ where: { id: partnerId } });

            const partnerTaxes = await PartnerTaxes.findAll({ where: { partnerId } });
            const taxTypeMapping = {};
            partnerTaxes.forEach((tax) => {
                taxTypeMapping[tax.taxType] = tax.id;
            });

            if (!partner) {
                throw new Error('partner not found');
            }

            let printerMapping = {};
            for (const printer of printers) {
                let newPrinter = await PartnerPrinter.findOne({
                    where: { macAddress: printer.mac_address, partnerId },
                    returning: true,
                });
                if (!newPrinter)
                    newPrinter = await PartnerPrinter.create(
                        {
                            name: printer.name,
                            macAddress: printer.mac_address,
                            isActive: printer.is_active,
                            partnerId,
                        },
                        { returning: true },
                    );
                printerMapping[printer.id] = newPrinter.id;
            }

            let reportingCategoryMapping = {};
            for (const reportingCategory of reportingCategories) {
                let newReportingCategory = await ReportingCategory.findOne({
                    where: { id: reportingCategory.id, partnerGroupId: groupId },
                });
                if (!newReportingCategory || !groupId)
                    newReportingCategory = await ReportingCategory.create(
                        {
                            partnerId,
                            partnerGroupId: groupId,
                            name: reportingCategory.name,
                            description: reportingCategory.description,
                            isActive: reportingCategory.is_active,
                        },
                        { returning: true },
                    );
                reportingCategoryMapping[reportingCategory.id] = newReportingCategory.id;
            }

            this.logger.info({
                message: 'partnerInfo',
                context: this.bulkMenuUpload.name,
                data: {
                    partnerName: partner.partnerName,
                    partnerId: partner.id,
                },
            });
            const sideCategoriesPayload = sideCategories.map((i) => ({
                partnerId: partnerId,
                name: i.name,
                label: i.label,
            }));

            const createdSideCategories = await SideCategory.bulkCreate(sideCategoriesPayload);

            const sideCategoryMapping = {};
            await Promise.all(
                sideCategories.map(async (item, index) => {
                    const sItems =
                        typeof item.side_items === 'string'
                            ? JSON.parse(item.side_items)
                            : item.side_items;
                    const sideItems = sItems?.map((sItem) => {
                        const payload = {
                            name: sItem.name,
                            itemImage: sItem.item_image,
                            calories: sItem.calories,
                            sideCategoryId: createdSideCategories[index].dataValues.id,
                            price: sItem.price,
                            isDefault: sItem.is_default,
                            enableCustomization: sItem.enable_customization,
                            // sideCustomisationId: sItem.side_customisation_id,
                            sideCustomizationLabel: sItem.side_customization_label,
                            applicableTaxes: sItem.applicable_taxes,
                            taxId: taxTypeMapping[sItem.taxType],
                            reportingCategoryId:
                                reportingCategoryMapping[sItem.reporting_category_id],
                            maxQuantityPerOrder: sItem.max_quantity_per_order,
                            sideItemSKU:
                                partnerId !== sourcePartnerId ? sItem.side_item_sku : undefined,
                        };
                        if (sItem.enable_customization && sItem.side_customisation_id) {
                            const findIndex = sideCategories.findIndex(
                                (cat) => cat.id === sItem.side_customisation_id,
                            );
                            if (findIndex > -1) {
                                payload.sideCustomisationId =
                                    createdSideCategories[findIndex].dataValues.id;
                            }
                        }
                        return payload;
                    });
                    if (sideItems) await SideItems.bulkCreate(sideItems);
                    sideCategoryMapping[item.id] = createdSideCategories[index].dataValues.id;
                }),
            );
            return await this.UploadMenu({
                menuData,
                partner,
                sideCategoryMapping,
                printerMapping,
                taxTypeMapping,
                reportingCategoryMapping,
                sourcePartnerId,
            });
        } catch (e) {
            this.logger.error({
                error: e,
                context: this.bulkMenuUpload.name,
            });
            throw e;
        }
    }

    async UploadMenu({
        menuData,
        partner,
        sideCategoryMapping,
        printerMapping,
        taxTypeMapping,
        reportingCategoryMapping,
        sourcePartnerId,
    }) {
        return Promise.all(
            menuData.map(async (m) => {
                const { menu_categories, ...menu } = m;
                delete menu.id;
                menu.partner_name = partner.partnerName;
                menu.partner_id = partner.id;
                let createdMenu;
                try {
                    createdMenu = await Menus.create({
                        menuName: menu.menu_name,
                        partnerId: menu.partner_id,
                        partnerName: menu.partner_name,
                        sortingIndex: menu.sorting_index,
                        isActive: menu.is_active,
                    });
                } catch (e) {
                    if (e.parent.code === 'ER_DUP_ENTRY') {
                        throw new Error(e?.parent?.sqlMessage);
                    }
                    throw e;
                }
                this.logger.info({
                    message: 'new menu created',
                    context: this.UploadMenu.name,
                    data: {
                        menuName: createdMenu.menuName,
                        partnerName: createdMenu.partnerName,
                    },
                });
                const menuCategories =
                    typeof menu_categories === 'string'
                        ? JSON.parse(menu_categories)
                        : menu_categories;
                await delay(auroraDelay);
                return this.UploadMenuCategory({
                    menuCategories,
                    createdMenu,
                    sideCategoryMapping,
                    printerMapping,
                    taxTypeMapping,
                    reportingCategoryMapping,
                    partnerId: partner.id,
                    sourcePartnerId,
                });
            }),
        );
    }

    async UploadMenuCategory({
        menuCategories,
        createdMenu,
        sideCategoryMapping,
        printerMapping,
        reportingCategoryMapping,
        taxTypeMapping,
        partnerId,
        sourcePartnerId,
    }) {
        if (!menuCategories) return [];
        await Promise.all(
            menuCategories?.map(async (mCategory) => {
                const { menu_items, ...category } = mCategory;
                category.menu_id = createdMenu.id;
                delete category.id;
                const createdCategory = await MenuCategory.create({
                    menuId: createdMenu.id,
                    name: category.name,
                    description: category.description,
                    takeoutAvailable: category.takeout_available,
                    isActive: category.is_active,
                    sortingIndex: category.sorting_index,
                });
                this.logger.info({
                    message: 'new category created',
                    context: this.UploadMenuCategory.name,
                    data: {
                        categoryName: createdCategory.name,
                        menuId: createdCategory.menuId,
                    },
                });

                await Promise.all(
                    menu_items?.map(async (mItem) => {
                        const {
                            menu_item_sides,
                            menu_item_variations,
                            item_additions,
                            item_allergies,
                            item_toppings,
                            item_substitutions,
                            ...item
                        } = mItem;
                        item.category_id = createdCategory.id;
                        delete item.id;
                        const createdItem = await MenuItem.create({
                            partnerId,
                            categoryId: createdCategory.id,
                            name: item.name,
                            description: item.description,
                            itemImage: item.item_image,
                            itemCalories: item.item_calories,
                            price: item.price,
                            applicableTaxes: item.applicable_taxes,
                            enableSpecialInstructions: item.enable_special_instructions,
                            enableModifiers: item.enable_modifiers,
                            takeoutAvailable: item.takeout_available,
                            isActive: item.is_active,
                            taxId: taxTypeMapping[item.tax_type],
                            tags: item.tags,
                            sortingIndex: item.sorting_index,
                            printerIds: item.printer_ids
                                ?.split(',')
                                ?.map((id) => printerMapping[id.trim()])
                                ?.join(','),
                            isOpenPrice: item.is_open_price,
                            reportingCategoryId:
                                reportingCategoryMapping[item.reporting_category_id],
                            maxQuantityPerOrder: item.max_quantity_per_order,
                            itemSKU: partnerId !== sourcePartnerId ? item.item_sku : undefined,
                        });
                        this.logger.info({
                            message: 'new menu item created',
                            context: this.UploadMenuCategory.name,
                            data: {
                                itemName: createdItem.name,
                                categoryId: createdItem.categoryId,
                            },
                        });
                        // create menu_item_sides
                        if (menu_item_sides?.length) {
                            await Promise.all(
                                menu_item_sides.map(async (side) => {
                                    if (!sideCategoryMapping[side.side_category_id]) return;
                                    delete side.id;
                                    const sides = await MenuItemSides.create({
                                        itemId: createdItem.id,
                                        sideCategoryId: sideCategoryMapping[side.side_category_id],
                                        label: side.label,
                                        required: side.required,
                                    });
                                    this.logger.info({
                                        message: 'new sides created',
                                        context: this.UploadMenuCategory.name,
                                        data: {
                                            sideCategoryId: sides.sideCategoryId,
                                            itemId: sides.itemId,
                                        },
                                    });
                                }),
                            );
                        }

                        if (menu_item_variations?.length) {
                            await Promise.all(
                                menu_item_variations.map(async (variation) => {
                                    const iVariation = await MenuItemVariation.create({
                                        itemId: createdItem.id,
                                        name: variation.name,
                                        price: variation.price,
                                        calories: variation.calories,
                                        isDelta: variation.is_delta,
                                        isDefault: variation.is_default,
                                    });
                                    this.logger.info({
                                        message: 'new menu item variation created',
                                        context: this.UploadMenuCategory.name,
                                        data: {
                                            variationName: iVariation.name,
                                            itemId: iVariation.itemId,
                                        },
                                    });
                                }),
                            );
                        }

                        if (item_additions?.length) {
                            await Promise.all(
                                item_additions.map(async (_addition) => {
                                    const addition = await ItemAdditions.create({
                                        itemId: createdItem.id,
                                        ingredientName: _addition.ingredient_name,
                                        price: _addition.price,
                                        enableAddition: _addition.enable_addition,
                                        createdAt: _addition.created_at,
                                        updatedAt: _addition.updated_at,
                                    });
                                    this.logger.info({
                                        message: 'new addition created',
                                        context: this.UploadMenuCategory.name,
                                        data: {
                                            ingredientName: addition.ingredientName,
                                            itemId: addition.itemId,
                                        },
                                    });
                                }),
                            );
                        }

                        if (item_allergies?.length) {
                            await Promise.all(
                                item_allergies.map(async (all) => {
                                    const allergy = await ItemAllergies.create({
                                        itemId: createdItem.id,
                                        allergyName: all.allergy_name,
                                        enableAllergy: all.enable_allergy,
                                        createdAt: all.created_at,
                                        updatedAt: all.updated_at,
                                    });
                                    this.logger.info({
                                        message: 'new item_allergies created',
                                        context: this.UploadMenuCategory.name,
                                        data: {
                                            allergyName: allergy.allergyName,
                                            itemId: allergy.itemId,
                                        },
                                    });
                                }),
                            );
                        }

                        if (item_toppings?.length) {
                            await Promise.all(
                                item_toppings.map(async (top) => {
                                    const topping = await ItemToppings.create({
                                        itemId: createdItem.id,
                                        toppingName: top.topping_name,
                                        enableTopping: top.enable_topping,
                                        price: top.price,
                                        createdAt: top.created_at,
                                        updatedAt: top.updated_at,
                                    });
                                    this.logger.info({
                                        message: 'new item_toppings created',
                                        context: this.UploadMenuCategory.name,
                                        data: {
                                            toppingName: topping.toppingName,
                                            itemId: topping.itemId,
                                        },
                                    });
                                }),
                            );
                        }

                        if (item_substitutions?.length) {
                            await Promise.all(
                                item_substitutions.map(async (subs) => {
                                    const subst = await ItemSubstitutions.create({
                                        itemId: createdItem.id,
                                        ingredientName: subs.ingredient_name,
                                        enableSubstitution: subs.enable_substitution,
                                        price: subs.price,
                                        createdAt: subs.created_at,
                                        updatedAt: subs.updated_at,
                                    });
                                    this.logger.info({
                                        message: 'new item_substitutions created',
                                        context: this.UploadMenuCategory.name,
                                        data: {
                                            ingredientName: subst.ingredientName,
                                            itemId: subst.itemId,
                                        },
                                    });
                                }),
                            );
                        }
                    }),
                );
            }),
        );
    }

    async setActiveByTags({ partnerId, tags, isActive }) {
        if (!tags.length) return;
        const tagFilters = tags
            .map(
                (tag) => `CONCAT(',', tags, ',') like concat('%,', ${SqlString.escape(tag)}, ',%')`,
            )
            .join(' OR ');

        const toggleQuery = `
            update
                menu_items mi
            left join menu_categories mc on
                mc.id = mi.category_id
            left join menus m on
                mc.menu_id = m.id
            set
                mi.is_active = :isActive
            where
                m.partner_id = :partnerId
                and (${tagFilters})
            `;
        return MenuItem.sequelize.query(toggleQuery, { replacements: { partnerId, isActive } });
    }

    async getPartnerFullMenu(partnerId, menuId = null) {
        this.logger.info({
            message: 'Start executing method',
            context: this.getPartnerFullMenu.name,
        });
        let { orderBy, condition } = await this.posMenuQueryOption(partnerId, 'pos', null, menuId);

        const partnerGroup = await this.restaurantGroupRepo.getActivePartnerGroupByPartnerId(
            partnerId,
        );

        // await blockingSleep(10000);
        return Menus.findAll({
            include: [
                {
                    model: menuAvailability,
                    as: 'availabilitesInfo',
                    attributes: {
                        exclude: ['menuId', 'menu_id', 'createdAt', 'updatedAt'],
                    },
                },
                {
                    model: MenuCategory,
                    as: 'menuCategories',
                    attributes: {
                        exclude: ['menuId', 'menu_id', 'createdAt', 'updatedAt', 'deletedAt'],
                    },
                    separate: true,
                    order: orderBy,
                    include: [
                        {
                            model: MenuItem,
                            as: 'menuItems',
                            attributes: {
                                include: [
                                    [
                                        Sequelize.literal('"' + partnerGroup?.weightUnit + '"'),
                                        'weightUnit',
                                    ],
                                ],
                                exclude: [
                                    'applicableTaxes',
                                    'itemCalories',
                                    'taxId',
                                    'createdAt',
                                    'updatedAt',
                                    'deletedAt',
                                ],
                            },
                            separate: true,
                            order: [
                                ...orderBy,
                                [Sequelize.col(`itemToppings.id`), 'ASC'],
                                [Sequelize.col(`menuItemSides.id`), 'ASC'],
                                [Sequelize.col(`itemSubstitutions.id`), 'ASC'],
                                [Sequelize.col(`itemAllergies.id`), 'ASC'],
                                [Sequelize.col(`menuItemVariations.id`), 'ASC'],
                                [Sequelize.col(`itemAdditions.id`), 'ASC'],
                                [Sequelize.col(`itemComponents.id`), 'ASC'],
                                [Sequelize.col(`itemContainers.id`), 'ASC'],
                            ],
                            where: { isArchived: false },
                            include: [
                                {
                                    model: PartnerTaxes,
                                    attributes: {
                                        exclude: [
                                            'partnerId',
                                            'taxType',
                                            'partner_id',
                                            'createdAt',
                                            'updatedAt',
                                        ],
                                    },
                                    as: 'taxTypes',
                                    include: [
                                        {
                                            model: TaxType,
                                            attributes: {
                                                exclude: ['createdAt', 'updatedAt'],
                                            },
                                            as: 'taxTypes',
                                        },
                                    ],
                                },
                                {
                                    model: MenuItemSides,
                                    as: 'menuItemSides',
                                    attributes: {
                                        exclude: [
                                            'itemId',
                                            'item_id',
                                            'createdAt',
                                            'updatedAt',
                                            'deletedAt',
                                        ],
                                    },
                                    order: [['id', 'ASC']],
                                    include: [
                                        {
                                            model: SideCategory,
                                            as: 'sideCategory',
                                            attributes: {
                                                exclude: [
                                                    'partnerId',
                                                    'partner_id',
                                                    'createdAt',
                                                    'updatedAt',
                                                    'deletedAt',
                                                ],
                                            },
                                            order: [['id', 'ASC']],
                                            include: [
                                                {
                                                    model: SideItems,
                                                    as: 'sideItems',
                                                    attributes: {
                                                        exclude: [
                                                            'createdAt',
                                                            'updatedAt',
                                                            'deletedAt',
                                                        ],
                                                    },
                                                    include: [
                                                        {
                                                            model: PartnerTaxes,
                                                            attributes: {
                                                                exclude: [
                                                                    'partnerId',
                                                                    'taxType',
                                                                    'partner_id',
                                                                    'createdAt',
                                                                    'updatedAt',
                                                                ],
                                                            },
                                                            as: 'taxTypes',
                                                            include: [
                                                                {
                                                                    model: TaxType,
                                                                    attributes: {
                                                                        exclude: [
                                                                            'createdAt',
                                                                            'updatedAt',
                                                                        ],
                                                                    },
                                                                    as: 'taxTypes',
                                                                },
                                                            ],
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    model: ItemAllergies,
                                    as: 'itemAllergies',
                                    attributes: {
                                        exclude: [
                                            'itemId',
                                            'item_id',
                                            'createdAt',
                                            'updatedAt',
                                            'deletedAt',
                                        ],
                                    },
                                    order: [['id', 'ASC']],
                                },
                                {
                                    model: ItemAdditions,
                                    as: 'itemAdditions',
                                    attributes: {
                                        exclude: [
                                            'itemId',
                                            'item_id',
                                            'createdAt',
                                            'updatedAt',
                                            'deletedAt',
                                        ],
                                    },
                                    order: [['id', 'ASC']],
                                },
                                {
                                    model: ItemSubstitutions,
                                    as: 'itemSubstitutions',
                                    attributes: {
                                        exclude: [
                                            'itemId',
                                            'item_id',
                                            'createdAt',
                                            'updatedAt',
                                            'deletedAt',
                                        ],
                                    },
                                    order: [['id', 'ASC']],
                                },
                                {
                                    model: ItemToppings,
                                    as: 'itemToppings',
                                    attributes: {
                                        exclude: [
                                            'itemId',
                                            'item_id',
                                            'createdAt',
                                            'updatedAt',
                                            'deletedAt',
                                        ],
                                    },
                                    order: [['id', 'ASC']],
                                },
                                {
                                    model: ItemComponents,
                                    as: 'itemComponents',
                                    where: { enableComponent: true },
                                    attributes: {
                                        exclude: [
                                            'itemId',
                                            'item_id',
                                            'createdAt',
                                            'updatedAt',
                                            'deletedAt',
                                        ],
                                    },
                                    required: false,
                                    order: [['id', 'ASC']],
                                },
                                {
                                    model: MenuItemVariation,
                                    as: 'menuItemVariations',
                                    attributes: {
                                        include: [
                                            [
                                                Sequelize.literal(
                                                    `(CASE menuItemVariations.is_delta WHEN 1 THEN (item_calories+menuItemVariations.calories) ELSE menuItemVariations.calories END)`,
                                                ),
                                                'calories',
                                            ],
                                        ],
                                        exclude: [
                                            'itemId',
                                            'item_id',
                                            'createdAt',
                                            'updatedAt',
                                            'deletedAt',
                                        ],
                                    },
                                    order: [['id', 'ASC']],
                                },
                                {
                                    model: ItemContainers,
                                    as: 'itemContainers',
                                    attributes: {
                                        include: [
                                            [
                                                Sequelize.literal(
                                                    '"' + partnerGroup?.weightUnit + '"',
                                                ),
                                                'weightUnit',
                                            ],
                                        ],
                                        exclude: [
                                            'itemId',
                                            'item_id',
                                            'templateId',
                                            'createdAt',
                                            'updatedAt',
                                            'deletedAt',
                                        ],
                                    },
                                },
                                {
                                    model: MenuCategory,
                                    as: 'itemCategory',
                                    attributes: {
                                        exclude: [
                                            'id',
                                            'menuId',
                                            'description',
                                            'takeoutAvailable',
                                            'isActive',
                                            'sortingIndex',
                                            'menu_id',
                                            'createdAt',
                                            'updatedAt',
                                            'deletedAt',
                                        ],
                                    },
                                },
                                {
                                    model: PaymentPromotions,
                                    as: 'paymentPromotions',
                                    where: { isActive: true },
                                    attributes: {
                                        exclude: [
                                            'createdAt',
                                            'updatedAt',
                                            'deletedAt',
                                            'payment',
                                            'item_id',
                                            'partner_id',
                                        ],
                                    },
                                    include: [
                                        {
                                            model: PaymentTypes,
                                            as: 'paymentTypeInfo',
                                            attributes: ['id', 'name', 'type'],
                                        },
                                    ],
                                    required: false,
                                },
                            ],
                        },
                    ],
                },
            ],

            where: condition,
            attributes: {
                exclude: ['partnerId', 'partner_id', 'deletedAt'],
            },
            benchmark: true,
            order: [
                ['sortingIndex', 'ASC'],
                ['id', 'DESC'],
            ],
        });
    }

    async saveReportingCategory(requestBody) {
        this.logger.info({
            message: 'Start executing method',
            context: this.saveReportingCategory.name,
            data: {
                requestBody,
            },
        });
        return 'id' in requestBody
            ? ReportingCategory.update(requestBody, { where: { id: requestBody?.id } })
            : ReportingCategory.create(requestBody);
    }

    async getReportingCategoriesWithMenuItems(partnerIds) {
        this.logger.info({
            message: 'Start executing method',
            context: this.getReportingCategoriesWithMenuItems.name,
        });
        const query = {
            where: { partnerId: partnerIds },
            include: [
                {
                    model: MenuItem,
                    as: 'menuItems',
                    attributes: ['id', 'name', 'itemImage'],
                },
                {
                    model: SideItems,
                    as: 'sideItems',
                    attributes: ['id', 'name', 'itemImage'],
                },
            ],
        };
        return ReportingCategory.findAll(query);
    }

    async deleteReportingCategory(partnerId, reportingCategoryId) {
        this.logger.info({
            message: 'Start executing method',
            context: this.deleteReportingCategory.name,
        });
        const query = {
            where: { partnerId: partnerId, id: reportingCategoryId },
        };
        const isDeleted = await ReportingCategory.destroy(query);
        if (isDeleted) {
            const bodyToUnassignReportingCategory = {
                reportingCategoryId: null,
            };
            MenuCategory.update(bodyToUnassignReportingCategory, {
                where: { reportingCategoryId },
            });
            MenuItem.update(bodyToUnassignReportingCategory, {
                where: { reportingCategoryId },
            });
            SideCategory.update(bodyToUnassignReportingCategory, {
                where: { reportingCategoryId },
            });
            SideItems.update(bodyToUnassignReportingCategory, {
                where: { reportingCategoryId },
            });
        }

        return isDeleted;
    }

    async bulkUpdateMenuItems(reportingCategoryId, menuCategoryId) {
        if (!reportingCategoryId || !menuCategoryId) {
            this.logger.alert({
                message: 'Required params are not valid!',
                context: this.bulkUpdateMenuItems.name,
                data: { reportingCategoryId, menuCategoryId },
            });
            return;
        }
        this.logger.info({
            message: 'Start executing method',
            context: this.bulkUpdateMenuItems.name,
            data: { reportingCategoryId, menuCategoryId },
        });

        try {
            return await MenuItem.update(
                { reportingCategoryId },
                { where: { categoryId: menuCategoryId } },
            );
        } catch (error) {
            this.logger.error({
                message: 'Error executing method',
                context: this.bulkUpdateMenuItems.name,
                data: { error },
            });
        }
    }

    async updateMenuItemPrinter(categoryId, printerIds, partnerId) {
        try {
            this.logger.info({
                message: 'Start executing method',
                context: this.updateMenuItemPrinter.name,
                data: {
                    categoryId,
                    printerIds,
                    partnerId,
                },
            });

            return await MenuItem.update({ printerIds }, { where: { categoryId, partnerId } });
        } catch (error) {
            this.logger.error({
                message: 'Error to updating printer in menu items',
                data: {
                    categoryId,
                    printerIds,
                    partnerId,
                },
                error,
            });
        }
    }

    bulkUpdateSideItems(reportingCategoryId, menuCategoryId) {
        this.logger.info({
            message: 'Start executing method',
            context: this.bulkUpdateSideItems.name,
            data: {
                reportingCategoryId,
                menuCategoryId,
            },
        });
        const query = `UPDATE side_items SET reporting_category_id = ${reportingCategoryId} WHERE side_category_id= ${menuCategoryId}`;

        return ReportingCategory.sequelize.query(query);
    }

    async updateMenuItemsByMenuCategoryId(menuCategoryId, payload) {
        this.logger.info({
            message: 'Start executing method',
            context: this.updateMenuItemsByMenuCategoryId.name,
            data: { menuCategoryId, payload },
        });
        return MenuItem.update(payload, {
            where: {
                categoryId: menuCategoryId,
            },
        });
    }

    async updateSideItemsBySideCategoryId(sideCategoryId, payload) {
        this.logger.info({
            message: 'Start executing method',
            context: this.updateSideItemsBySideCategoryId.name,
            data: { sideCategoryId, payload },
        });
        return SideItems.update(payload, {
            where: { sideCategoryId },
        });
    }

    async getMenuItemsForPartnerGroup({ partnerIds, limit, page, searchQuery }) {
        page = Number.isInteger(+page) ? page : 1;

        const paginationClause =
            Number(limit) > 0 ? `LIMIT ${limit} OFFSET ${(page - 1) * limit}` : '';

        let itemSearchQuery = 'AND mi.is_archived = false';

        if (searchQuery?.length) {
            itemSearchQuery = `
            AND (
                mi.name LIKE :searchQuery
                OR mi.item_sku LIKE :searchQuery
            )
            `;
        }

        const query = `
            SELECT
                mi.id, IFNULL(REPLACE(mi.price, ',', ''), 0.00) as price, mi.item_sku AS itemSKU,
                mi.name, mi.deleted_at AS deletedAt, mi.is_active AS isActive,
                mc.id AS categoryId, mi.upc, mi.tags, m.partner_id AS partnerId,
                m.id AS menuId, m.partner_name AS revenueCenter,
                mi.template_id as templateId,
                COUNT(mi.id) OVER () AS totalRows
            FROM menus m
            INNER JOIN menu_categories mc ON m.id = mc.menu_id
            INNER JOIN menu_items mi ON mc.id = mi.category_id
            WHERE m.partner_id IN (:partnerIds)
            ${itemSearchQuery}
            ORDER BY mi.deleted_at ASC
            ${paginationClause}
        `;

        return MenuItem.sequelize.query(query, {
            replacements: { partnerIds, searchQuery: `%${searchQuery}%` },
            type: Sequelize.QueryTypes.SELECT,
        });
    }

    async updateMenuCategory(categoryData, categoryId, transaction) {
        return MenuCategory.update(categoryData, { where: { id: categoryId }, transaction });
    }

    async isUpcSKUUnique({ upc, itemSKU, partnerId, itemId, categoryId }) {
        let whereClause;

        if (upc) {
            whereClause = `WHERE mi.upc = :upc`;
        } else if (itemSKU) {
            whereClause = `WHERE mi.item_sku = :itemSKU`;
        }

        if (categoryId) {
            whereClause += ` AND mi.category_id = :categoryId`;
        }

        const query = `
        SELECT COUNT(mi.id) as count, mi.id
        FROM menu_items mi
        INNER JOIN menu_categories mc 
        ON mc.id = mi.category_id 
        INNER JOIN menus m 
        ON m.id = mc.menu_id AND m.partner_id = :partnerId
        ${whereClause}
        `;

        const [{ count, id }] = await MenuItem.sequelize.query(query, {
            replacements: { upc, partnerId, itemSKU, categoryId },
            type: Sequelize.QueryTypes.SELECT,
        });

        if (count === 0 || (count === 1 && id === itemId)) return true;
        else return false;
    }

    getModel(tableName) {
        switch (tableName) {
            case 'menu_item_variations':
                return MenuItemVariation;
            case 'item_additions':
                return ItemAdditions;
            case 'item_toppings':
                return ItemToppings;
            case 'item_substitutions':
                return ItemSubstitutions;
        }
    }

    async isUpcSKUUniqueForItemEntities({ tableName, partnerId, upc, entityId, sku }) {
        let whereClause;

        if (upc) {
            whereClause = `WHERE tb.upc = :upc`;
        } else if (sku) {
            whereClause = `WHERE tb.sku = :sku`;
        }

        const query = `
        SELECT count(tb.id) as count, tb.id as id
        FROM ${tableName} tb 
        INNER JOIN menu_items mi 
        ON mi.id = tb.item_id 
        INNER JOIN menu_categories mc 
        ON mc.id = mi.category_id 
        INNER JOIN menus m 
        ON m.id = mc.menu_id AND m.partner_id = :partnerId
        ${whereClause}
        `;

        const model = this.getModel(tableName);

        const [{ count, id }] = await model.sequelize.query(query, {
            replacements: { upc, partnerId, sku },
            type: Sequelize.QueryTypes.SELECT,
        });

        if (count === 0 || (count === 1 && id === entityId)) return true;
        else return false;
    }

    async getMenuDetailsByMenuCategoryId(categoryId) {
        const query = `
            SELECT
                m.partner_id AS menuPartnerId,
                m.menu_name AS menuName,
                mc.name AS categoryName
            FROM
                menu_categories AS mc
            JOIN menus AS m ON
                m.id = mc.menu_id
            WHERE
                mc.id = :categoryId`;

        const [data] = await MenuCategory.sequelize.query(query, {
            replacements: { categoryId },
            type: Sequelize.QueryTypes.SELECT,
        });
        if (!data) return null;
        return data;
    }

    async getCategoryIdByMenuAndCategoryName(menuName, categoryName, partnerId) {
        const query = `
            SELECT
                mc.id AS categoryId
            FROM
                menu_categories AS mc
            LEFT JOIN menus AS m ON
                m.id = mc.menu_id
            WHERE
                m.menu_name = :menuName
                AND mc.name = :categoryName
                AND m.partner_id = :partnerId`;

        const [row] = await MenuCategory.sequelize.query(query, {
            replacements: { menuName, categoryName, partnerId },
            type: Sequelize.QueryTypes.SELECT,
        });
        if (!row?.categoryId) return null;
        return row.categoryId;
    }

    async getCategoryIdsByMenuAndCategoryName(menuName, categoryName, partnerIds) {
        const query = `
            SELECT
                mc.id AS categoryId
            FROM
                menu_categories AS mc
            LEFT JOIN menus AS m ON
                m.id = mc.menu_id
            WHERE
                m.menu_name = :menuName
                AND mc.name = :categoryName
                AND m.partner_id IN (:partnerIds)`;

        const res = await MenuCategory.sequelize.query(query, {
            replacements: { menuName, categoryName, partnerIds },
            type: Sequelize.QueryTypes.SELECT,
        });
        return res;
    }

    async checkIfCategoryExists(menuId, categoryName, partnerId) {
        const query = `
            SELECT
                mc.id AS categoryId
            FROM
                menu_categories AS mc
            JOIN menus AS m ON
                m.id = mc.menu_id
            WHERE
                m.id = :menuId
                AND mc.name = :categoryName
                AND m.partner_id IN (:partnerId)`;

        const [row] = await MenuCategory.sequelize.query(query, {
            replacements: { menuId, categoryName, partnerId },
            type: Sequelize.QueryTypes.SELECT,
        });
        if (!row?.categoryId) return null;
        return row.categoryId;
    }

    async getCategoryData(menuId, categoryId) {
        return MenuCategory.findOne({
            include: [
                {
                    model: Menus,
                    as: 'menu',
                    where: {
                        id: menuId,
                    },
                },
            ],
            where: {
                id: categoryId,
            },
            raw: true,
            nest: true,
        });
    }

    async getPartnerAllCategories(partnerId) {
        const whereSpec = {};

        if (Array.isArray(partnerId)) {
            whereSpec['partnerId'] = { [Op.in]: partnerId };
        } else {
            whereSpec['partnerId'] = partnerId;
        }
        return await MenuCategory.findAll({
            include: [
                {
                    model: Menus,
                    as: 'menu',
                    where: whereSpec,
                    attributes: [],
                },
            ],
            attributes: ['id', 'name'],
        });
    }

    async getMenuItemsByTemplateId(templateId) {
        return await MenuItem.findAll({
            where: { templateId },
            attributes: ['id', 'partnerId'],
        });
    }

    async deleteMenuItemEntities(itemId, transaction) {
        this.logger.info({
            message: 'Start deleting menu item entities',
            context: this.deleteMenuItemEntities.name,
            data: { itemId },
        });

        const querySpecs = {
            where: { itemId },
            individualHooks: true,
        };

        if (transaction) querySpecs['transaction'] = transaction;

        return Promise.all([
            MenuItem.destroy({ where: { id: itemId }, individualHooks: true, transaction }),
            ItemAdditions.destroy(querySpecs),
            ItemSubstitutions.destroy(querySpecs),
            ItemToppings.destroy(querySpecs),
            ItemAllergies.destroy(querySpecs),
            MenuItemVariation.destroy(querySpecs),
            ItemContainers.destroy(querySpecs),
        ]);
    }

    /**
     * @param {Object} param
     * @param {string} param.sku
     * @param {number | undefined} param.menuId
     * @param {number} param.partnerId
     */
    async getSkuTemplateCount({ sku, menuId, partnerId }) {
        try {
            const query = `
            SELECT count(mi.id) as itemCount
            FROM menu_items mi 
            JOIN menu_categories mc 
                ON mi.category_id = mc.id
            JOIN menus m 
                ON mc.menu_id = m.id 
                AND m.partner_id = :partnerId 
                AND m.id = :menuId
            WHERE mi.item_sku = :sku
            `;

            const [{ itemCount }] = await MenuItem.sequelize.query(query, {
                replacements: { menuId, sku, partnerId },
                type: QueryTypes.SELECT,
            });

            return itemCount;
        } catch (err) {
            this.logger.error({
                message: 'Failed to check SKU uniqueness',
                error: err,
                context: this.isSKUUnique.name,
            });
            if (err instanceof CustomError) {
                throw err;
            }
            throw new InternalServerError();
        }
    }

    async getMenuItemPartnerIdsByTemplateId(templateId) {
        const uniquePartners = await MenuItem.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('partner_id')), 'partnerId']],
            where: { templateId },
        });
        return uniquePartners.map((partner) => partner.partnerId);
    }

    findOrCreateReportingCategory({ name, partnerId, partnerGroupId }, transaction) {
        this.logger.info({
            message: 'Start executing method findOrCreateReportingCategory',
            context: this.findOrCreateReportingCategory.name,
            data: { name, partnerId, partnerGroupId },
        });
        return ReportingCategory.findOrCreate({
            where: { partnerGroupId, name },
            defaults: { partnerId, name, partnerGroupId },
            transaction,
        });
    }

    async updateItemComponentsByTemplateId(data, templateId, transaction = null) {
        return ItemComponents.update(data, { where: { templateId }, transaction });
    }

    async createItemComponent(data, transaction = null) {
        return ItemComponents.create({ ...data }, { transaction });
    }

    async deleteItemComponents(templateId, menuItemIds, transaction = null) {
        return ItemComponents.destroy({ where: { templateId, itemId: menuItemIds }, transaction });
    }

    async saveItemComponents(payload, transaction = null) {
        this.logger.info({
            message: 'Start executing method',
            context: this.saveItemComponents.name,
            data: {
                payload,
            },
        });
        const options = {
            updateOnDuplicate: ['componentName', 'quantiry'],
        };
        if (transaction) {
            options.transaction = transaction;
        }
        return ItemComponents.bulkCreate(payload, options);
    }

    async findItemComponentsByItemId(itemId) {
        return ItemComponents.findAll({
            where: {
                itemId,
            },
            order: [['id', 'ASC']],
        });
    }
}
