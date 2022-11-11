/* eslint-disable no-unused-vars */
require("dotenv").config();
const { Op } = require("sequelize");
const sequelize = require("../config/database/connection");
const Category = require("../models/ProductCategory");
const Product = require("../models/Product");
const ProductImage = require("../models/ProductImage");

exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.findAll();
    return res.status(200).send({
      success: true,
      data: categories
    });
  } catch (error) {
    return next(error);
  }
};

exports.getCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      where: { id: req.params.categoryId }
    });
    return res.status(200).send({
      success: true,
      data: category
    });
  } catch (error) {
    return next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  sequelize.transaction(async t => {
    try {
      const { name, description } = req.body;
      const [category, created] = await Category.findOrCreate({
        where: { name, description },
        transaction: t
      });
      return res.status(200).send({
        success: true,
        data: category
      });
    } catch (error) {
      t.rollback();
      return next(error);
    }
  });
};

exports.updateCategory = async (req, res, next) => {
  sequelize.transaction(async t => {
    try {
      const { name, description } = req.body;
      const { categoryId } = req.params;
      const category = await Category.findOne({
        where: { id: categoryId }
      });
      if (!category) {
        return res.status(404).send({
          success: false,
          message: "Invalid category"
        });
      }
      await Category.update(
        {
          name,
          description
        },
        { where: { id: categoryId }, transaction: t }
      );
      return res.status(200).send({
        success: true,
        data: category
      });
    } catch (error) {
      t.rollback();
      return next(error);
    }
  });
};

exports.deleteCategory = async (req, res, next) => {
  sequelize.transaction(async t => {
    try {
      const { categoryId } = req.params;
      const category = await Category.findOne({
        where: { id: categoryId }
      });
      if (!category) {
        return res.status(404).send({
          success: false,
          message: "Invalid category"
        });
      }
      await Category.destroy({ where: { id: categoryId }, transaction: t });
      return res.status(200).send({
        success: true,
        message: "Category deleted successfully"
      });
    } catch (error) {
      t.rollback();
      return next(error);
    }
  });
};

exports.createProduct = async (req, res, next) => {
  sequelize.transaction(async t => {
    try {
      const { categoryId, name, price, quantity, unit, description } = req.body;
      console.log(req.files);
      const creatorId = req.user.id;
      const request = {
        categoryId,
        name,
        price,
        quantity,
        unit,
        description,
        creatorId,
        status: req.body.status
      };

      const photos = [];
      for (let i = 0; i < req.files.length; i++) {
        photos.push({
          name: req.files[i].originalname,
          image: req.files[i].path,
          creatorId
        });
      }
      if (photos.length > 0) {
        request.image = photos[0].image;
        request.product_image = photos;
      }
      const product = await Product.create(request, {
        transaction: t,
        include: [
          {
            model: ProductImage,
            as: "product_image"
          }
        ]
      });

      return res.status(200).send({
        success: true,
        message: "Product created successfully",
        data: product
      });
    } catch (error) {
      console.log(error);
      t.rollback();
      return next(error);
    }
  });
};

exports.updateProduct = async (req, res, next) => {
  sequelize.transaction(async t => {
    try {
      const { productId } = req.params;
      const request = req.body;
      console.log(req.files);
      const creatorId = req.user.id;
      const product = await Product.findByPk(productId, {
        attributes: ["id"]
      });
      if (!product) {
        return res.status(404).send({
          success: false,
          message: "Invalid Product"
        });
      }

      if (req.files) {
        const photos = [];
        for (let i = 0; i < req.files.length; i++) {
          photos.push({
            name: req.files[i].originalname,
            image: req.files[i].path,
            creatorId,
            productId
          });
        }
        const images = await ProductImage.findAll({
          where: { productId },
          attributes: ["id"]
        });
        if (images.length > 0) {
          const Ids = images.map(img => img.id);
          await ProductImage.destroy({ where: { id: Ids }, transaction: t });
        }
        await ProductImage.bulkCreate(photos, { transaction: t });
        request.image = photos[0].image;
      }

      await Product.update(request, {
        where: { id: productId },
        transaction: t
      });

      return res.status(200).send({
        success: true,
        message: "Product updated successfully"
      });
    } catch (error) {
      console.log(error);
      t.rollback();
      return next(error);
    }
  });
};

exports.getAllProducts = async (req, res, next) => {
  try {
    const creatorId = req.user.id;
    const where = {
      creatorId
    };
    if (req.query.status) {
      where.status = req.query.status;
    }
    const products = await Product.findAll({
      where,
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "description"]
        },
        {
          model: ProductImage,
          as: "product_image",
          attributes: ["id", "name", "image"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });
    return res.status(200).send({
      success: true,
      data: products
    });
  } catch (error) {
    return next(error);
  }
};

exports.getSingleProducts = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.productId },
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "description"]
        },
        {
          model: ProductImage,
          as: "product_image",
          attributes: ["id", "name", "image"]
        }
      ]
    });
    return res.status(200).send({
      success: true,
      data: product
    });
  } catch (error) {
    return next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  sequelize.transaction(async t => {
    try {
      const { productId } = req.params;
      const creatorId = req.user.id;

      const product = await Product.findOne({
        where: { id: productId }
      });
      if (!product) {
        return res.status(404).send({
          success: false,
          message: "Invalid Product"
        });
      }
      if (creatorId !== product.creatorId) {
        return res.status(400).send({
          success: false,
          message: "Unauthorised request"
        });
      }
      if (product.showInShop || product.status === "approved") {
        return res.status(400).send({
          success: false,
          message: "Product in store can't be deleted"
        });
      }
      await Product.destroy({ where: { id: productId }, transaction: t });
      return res.status(200).send({
        success: true,
        message: "Product deleted successfully"
      });
    } catch (error) {
      t.rollback();
      return next(error);
    }
  });
};
