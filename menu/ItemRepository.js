import { ItemAllergies } from '../../models/menu/ItemAllergies';
import { ItemSubstitutions } from '../../models/menu/ItemSubstitutions';
import { ItemAdditions } from '../../models/menu/ItemAdditions';
import { ItemToppings } from '../../models/menu/ItemToppings';
import { MenuItem } from '../../models/menu/MenuItemModel';
import Logger from '@cheqplease/structured-logger';

export class ItemRepository {
    constructor() {
        if (ItemRepository.instance) return ItemRepository.instance;
        this.logger = new Logger(this);
        ItemRepository.instance = this;
    }
    async updateEnableItemInstruction(modifiers) {
        return MenuItem.update(
            {
                enableSpecialInstructions: modifiers.enableSpecialInstructions,
                enableModifiers: modifiers.enableModifiers,
            },
            { where: { id: modifiers.itemId } },
        );
    }

    async saveToppings(payload, transaction = null) {
        this.logger.info({
            message: 'Start executing method',
            context: this.saveToppings.name,
            data: {
                payload,
            },
        });
        const options = {
            updateOnDuplicate: ['toppingName', 'price', 'enableTopping', 'upc', 'sku'],
        };
        if (transaction) {
            options.transaction = transaction;
        }
        return ItemToppings.bulkCreate(payload, options);
    }

    async saveToppingByTemplateId(payload, where = {}, transaction = null) {
        const options = {
            updateOnDuplicate: ['toppingName', 'price', 'enableTopping', 'upc', 'sku'],
        };
        if (transaction) {
            options.transaction = transaction;
        }
        return ItemToppings.update(payload, { where, ...options });
    }

    async saveAdditionsByTemplateId(payload, where = {}, transaction = null) {
        const options = {
            updateOnDuplicate: ['ingredientName', 'price', 'enableAddition', 'upc', 'sku'],
        };
        if (transaction) {
            options.transaction = transaction;
        }
        return ItemAdditions.update(payload, { where, ...options });
    }

    async saveSubstitutionsByTemplateId(payload, where = {}, transaction = null) {
        const options = {
            updateOnDuplicate: ['ingredientName', 'price', 'enableSubstitution', 'upc', 'sku'],
        };
        if (transaction) {
            options.transaction = transaction;
        }
        return ItemSubstitutions.update(payload, { where, ...options });
    }

    async saveAllergiesByTemplateId(payload, where = {}, transaction = null) {
        const options = {};
        if (transaction) {
            options.transaction = transaction;
        }
        return ItemAllergies.update(payload, { where, ...options });
    }

    async deleteToppings(toppingIds) {
        this.logger.info({
            message: 'Start executing method',
            context: this.deleteToppings.name,
            data: {
                toppingIds,
            },
        });
        return ItemToppings.destroy({ where: { id: toppingIds }, individualHooks: true });
    }

    async saveSubstitutions(payload, transaction = null) {
        this.logger.info({
            message: 'Start executing method',
            context: this.saveSubstitutions.name,
            data: {
                payload,
            },
        });
        const options = {
            updateOnDuplicate: ['ingredientName', 'price', 'enableSubstitution', 'sku', 'upc'],
        };
        if (transaction) {
            options.transaction = transaction;
        }
        return ItemSubstitutions.bulkCreate(payload, options);
    }

    async deleteSubstitutions(substitutionId) {
        this.logger.info({
            message: 'Start executing method',
            context: this.deleteSubstitutions.name,
            data: {
                substitutionId,
            },
        });
        return ItemSubstitutions.destroy({ where: { id: substitutionId }, individualHooks: true });
    }

    async saveAdditions(payload, transaction = null) {
        this.logger.info({
            message: 'Start executing method',
            context: this.saveAdditions.name,
            data: {
                payload,
            },
        });
        const options = {
            updateOnDuplicate: ['ingredientName', 'price', 'enableAddition', 'sku', 'upc'],
        };
        if (transaction) {
            options.transaction = transaction;
        }
        return ItemAdditions.bulkCreate(payload, options);
    }

    async deleteAdditions(additionId) {
        this.logger.info({
            message: 'Start executing method',
            context: this.deleteAdditions.name,
            data: {
                additionId,
            },
        });

        return ItemAdditions.destroy({ where: { id: additionId }, individualHooks: true });
    }

    async saveAllergies(allergies, transaction = null) {
        this.logger.info({
            message: 'Start executing method',
            context: this.saveAllergies.name,
            data: {
                allergies,
            },
        });
        const options = {};
        if (transaction) {
            options.transaction = transaction;
        }
        return allergies.id
            ? ItemAllergies.update(allergies, { where: { id: allergies.id } }, options)
            : ItemAllergies.create(allergies, options);
    }

    async deleteAllergies(allergyId) {
        this.logger.info({
            message: 'Start executing method',
            context: this.deleteAllergies.name,
            data: {
                allergyId,
            },
        });
        return ItemAllergies.destroy({ where: { id: allergyId }, individualHooks: true });
    }
}
