import { config } from '../../config/Shared';

export const sidesQuery = () => `
SELECT sc.id, sc.name, sc.label, sc.partner_id,
    (
        SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id',
                    si.id,
                    'name',
                    si.name,
                    'item_image',
                    si.item_image,
                    'calories',
                    si.calories,
                    'side_category_id',
                    si.side_category_id,
                    'side_item_sku',
                    si.side_item_sku,
                    'price',
                    si.price,
                    'is_default',
                    si.is_default,
                    'enable_customization',
                    si.enable_customization,
                    'side_customisation_id',
                    si.side_customisation_id,
                    'side_customization_label',
                    si.side_customization_label,
                    'applicable_taxes',
                    si.applicable_taxes,
                    'tax_id',
                    si.tax_id,
                    'reporting_category_id',
                    si.reporting_category_id,
                    'tax_type',
                    pt.tax_type,
                    'max_quantity_per_order',
                    si.max_quantity_per_order
                    )
            )
        FROM ${config.dbDetails.CUSTOMER_DB}.side_items si
        LEFT JOIN ${config.dbDetails.DB_NAME}.partner_taxes pt ON pt.id = si.tax_id
        WHERE si.side_category_id = sc.id AND si.deleted_at IS NULL
    ) side_items
FROM ${config.dbDetails.CUSTOMER_DB}.side_categories sc
WHERE partner_id = :partnerId AND sc.deleted_at IS NULL;`;

export const menuQuery = () => `
SELECT m.id, m.menu_name, m.partner_id, m.partner_name, m.sorting_index, m.is_active,
    (
        SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id',
                    mc.id,
                    'menu_id',
                    mc.menu_id,
                    'name',
                    mc.name,
                    'description',
                    mc.description,
                    'takeout_available',
                    mc.takeout_available,
                    'is_active',
                    mc.is_active,
                    'sorting_index',
                    mc.sorting_index,
                    'menu_items',
                    (
                        SELECT JSON_ARRAYAGG(
                                JSON_OBJECT(
                                    'id',
                                    mi.id,
                                    'category_id',
                                    mi.category_id,
                                    'name',
                                    mi.name,
                                    'description',
                                    mi.description,
                                    'price',
                                    mi.price,
                                    'item_image',
                                    mi.item_image,
                                    'item_calories',
                                    mi.item_calories,
                                    'takeout_available',
                                    mi.takeout_available,
                                    'comes_with',
                                    mi.comes_with,
                                    'applicable_taxes',
                                    mi.applicable_taxes,
                                    'enable_special_instructions',
                                    mi.enable_special_instructions,
                                    'is_active',
                                    mi.is_active,
                                    'tax_id',
                                    mi.tax_id,
                                    'tax_type',
                                    pt.tax_type,
                                    'sorting_index',
                                    mi.sorting_index,
                                    'reporting_category_id',
                                    mi.reporting_category_id,
                                    'tags',
                                    mi.tags,
                                    'is_open_price',
                                    mi.is_open_price,
                                    'enable_modifiers',
                                    mi.enable_modifiers,
                                    'printer_ids',
                                    mi.printer_ids,
                                    'max_quantity_per_order',
                                    mi.max_quantity_per_order,
                                    'item_sku',
                                    mi.item_sku,
                                    'menu_item_sides',
                                    (
                                        SELECT JSON_ARRAYAGG(
                                                JSON_OBJECT(
                                                    'id',
                                                    mis.id,
                                                    'side_category_id',
                                                    mis.side_category_id,
                                                    'label',
                                                    mis.label,
                                                    'item_id',
                                                    mis.item_id,
                                                    'required',
                                                    mis.required
                                                )
                                            )
                                        FROM ${config.dbDetails.CUSTOMER_DB}.menu_item_sides mis
                                        WHERE mis.item_id = mi.id AND mis.deleted_at IS NULL
                                    ),
                                    'menu_item_variations',
                                    (
                                        SELECT JSON_ARRAYAGG(
                                                JSON_OBJECT(
                                                    'id',
                                                    miv.id,
                                                    'item_id',
                                                    miv.item_id,
                                                    'name',
                                                    miv.name,
                                                    'calories',
                                                    miv.calories,
                                                    'price',
                                                    miv.price,
                                                    'is_delta',
                                                    miv.is_delta,
                                                    'is_default',
                                                    miv.is_default
                                                )
                                            )
                                        FROM ${config.dbDetails.CUSTOMER_DB}.menu_item_variations miv
                                        WHERE miv.item_id = mi.id AND miv.deleted_at IS NULL
                                    ),
                                    'item_additions',
                                    (
                                        SELECT JSON_ARRAYAGG(
                                                JSON_OBJECT(
                                                    'id',
                                                    iadd.id,
                                                    'item_id',
                                                    iadd.item_id,
                                                    'ingredient_name',
                                                    iadd.ingredient_name,
                                                    'price',
                                                    iadd.price,
                                                    'enable_addition',
                                                    iadd.enable_addition,
                                                    'created_at',
                                                    iadd.created_at,
                                                    'updated_at',
                                                    iadd.updated_at
                                                )
                                            )
                                        FROM ${config.dbDetails.CUSTOMER_DB}.item_additions iadd
                                        WHERE iadd.item_id = mi.id AND iadd.deleted_at IS NULL
                                    ),
                                    'item_allergies',
                                    (
                                        SELECT JSON_ARRAYAGG(
                                                JSON_OBJECT(
                                                    'id',
                                                    iall.id,
                                                    'item_id',
                                                    iall.item_id,
                                                    'allergy_name',
                                                    iall.allergy_name,
                                                    'enable_allergy',
                                                    iall.enable_allergy,
                                                    'created_at',
                                                    iall.created_at,
                                                    'updated_at',
                                                    iall.updated_at
                                                )
                                            )
                                        FROM ${config.dbDetails.CUSTOMER_DB}.item_allergies iall
                                        WHERE iall.item_id = mi.id AND iall.deleted_at IS NULL
                                    ),
                                    'item_toppings',
                                    (
                                        SELECT JSON_ARRAYAGG(
                                                JSON_OBJECT(
                                                    'id',
                                                    it.id,
                                                    'item_id',
                                                    it.item_id,
                                                    'price',
                                                    it.price,
                                                    'topping_name',
                                                    it.topping_name,
                                                    'enable_topping',
                                                    it.enable_topping,
                                                    'created_at',
                                                    it.created_at,
                                                    'updated_at',
                                                    it.updated_at
                                                )
                                            )
                                        FROM ${config.dbDetails.CUSTOMER_DB}.item_toppings it
                                        WHERE it.item_id = mi.id AND it.deleted_at IS NULL
                                    ),
                                    'item_substitutions',
                                    (
                                        SELECT JSON_ARRAYAGG(
                                                JSON_OBJECT(
                                                    'id',
                                                    isub.id,
                                                    'item_id',
                                                    isub.item_id,
                                                    'ingredient_name',
                                                    isub.ingredient_name,
                                                    'price',
                                                    isub.price,
                                                    'enable_substitution',
                                                    isub.enable_substitution,
                                                    'created_at',
                                                    isub.created_at,
                                                    'updated_at',
                                                    isub.updated_at
                                                )
                                            )
                                        FROM ${config.dbDetails.CUSTOMER_DB}.item_substitutions isub
                                        WHERE isub.item_id = mi.id AND isub.deleted_at IS NULL
                                    )
                                )
                            )
                        FROM ${config.dbDetails.CUSTOMER_DB}.menu_items mi
                        LEFT JOIN ${config.dbDetails.DB_NAME}.partner_taxes pt ON pt.id = mi.tax_id
                        WHERE mi.category_id = mc.id AND mi.deleted_at IS NULL
                    )
                )
            ) category
        FROM ${config.dbDetails.CUSTOMER_DB}.menu_categories mc
        WHERE mc.menu_id = m.id AND mc.deleted_at IS NULL
    ) menu_categories
FROM ${config.dbDetails.CUSTOMER_DB}.menus m
WHERE m.partner_id = :partnerId AND m.deleted_at IS NULL;
`;

export const printersQuery = () =>
    `SELECT * FROM ${config.dbDetails.DB_NAME}.partner_printers WHERE partner_id = :partnerId`;

export const reportingCategoriesQuery = () =>
    `SELECT * FROM ${config.dbDetails.CUSTOMER_DB}.reporting_categories WHERE partner_group_id = :groupId OR partner_id = :partnerId`;
