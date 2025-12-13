const cloudinary = require("../config/cloudDinary");
const { Created, OK } = require("../core/success.response");
const { BadRequestError, NotFoundError } = require("../core/error.response");
const productModel = require("../models/product.model");
const fs = require("fs/promises");

const getPublicId = require("../utils/getPublicId");

class ProductController {
  async createProduct(req, res) {
    const dataImages = req.files;
    const {
      nameProduct,
      priceProduct,
      discountProduct,
      stockProduct,
      descriptionProduct,
      categoryProduct,
      metadata,
    } = req.body;
    if (
      !nameProduct ||
      !priceProduct ||
      !discountProduct ||
      !stockProduct ||
      !descriptionProduct ||
      !categoryProduct ||
      !dataImages ||
      !metadata
    ) {
      throw new BadRequestError("Thiếu thông tin sản phẩm");
    }

    let imagesProduct = [];

    for (const image of dataImages) {
      const { path, filename } = image;
      const { url } = await cloudinary.uploader.upload(path, {
        folder: "products",
        resource_type: "image",
      });
      imagesProduct.push(url || filename);
      await fs.unlink(path);
    }

    let parsedMetadata;
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch (error) {
      throw new BadRequestError("Metadata phải là JSON hợp lệ");
    }

    const newProduct = await productModel.create({
      nameProduct,
      priceProduct,
      discountProduct,
      stockProduct,
      descriptionProduct,
      categoryProduct,
      // matadata,
      metadata: parsedMetadata,
      imagesProduct,
    });

    return new Created({
      message: "Tạo sản phẩm thành công",
      metadata: newProduct,
    }).send(res);
  }

  async getAllProducts(req, res) {
    const products = await productModel.find();
    return new OK({
      message: "Lấy sản phẩm thành công",
      metadata: products,
    }).send(res);
  }

  async updateProduct(req, res) {
    const { id } = req.params;
    const {
      nameProduct,
      priceProduct,
      discountProduct,
      stockProduct,
      descriptionProduct,
      categoryProduct,
      metadata,
      oldImagesProduct,
    } = req.body;

    const dataImage = req.files;

    if (
      !id ||
      !nameProduct ||
      !priceProduct ||
      !discountProduct ||
      !stockProduct ||
      !descriptionProduct ||
      !categoryProduct ||
      !metadata ||
      !oldImagesProduct
    ) {
      throw new BadRequestError("Thiếu thông tin sản phẩm");
    }

    const findProduct = await productModel.findById(id);
    if (!findProduct) {
      throw new NotFoundError("Sản phẩm không tồn tại");
    }
    // Update logic here
    let imagesProduct = [];
    if (dataImage && dataImage.length > 0) {
      for (const image of dataImage) {
        const { path, filename } = image;
        const { url } = await cloudinary.uploader.upload(path, {
          folder: "products",
          resource_type: "image",
        });
        imagesProduct.push(url || filename);
        await fs.unlink(path);
      }
    }

    const parserOldImages = oldImagesProduct
      ? JSON.parse(oldImagesProduct)
      : [];

    const finalImagesProduct = [...parserOldImages, ...imagesProduct];

    let parsedMetadata;
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch (error) {
      throw new BadRequestError("Metadata phải là JSON hợp lệ");
    }

    const updateProduct = await productModel.findByIdAndUpdate(
      id,
      {
        nameProduct,
        priceProduct,
        discountProduct,
        stockProduct,
        descriptionProduct,
        categoryProduct,
        metadata: parsedMetadata,
        imagesProduct: finalImagesProduct,
      },
      { new: true }
    );

    if (!updateProduct) {
      throw new NotFoundError("Cập nhật sản phẩm thất bại");
    }

    return new OK({
      message: "Cập nhật sản phẩm thành công",
      metadata: updateProduct,
    }).send(res);
  }

  async getProductById(req, res) {
    const { id } = req.params;

    const product = await productModel.findById(id);
    if (!product) {
      throw new NotFoundError("Sản phẩm không tồn tại");
    }
    return new OK({
      message: "Lấy sản phẩm thành công",
      metadata: product,
    }).send(res);
  }

  async deleteProduct(req, res) {
    const { id } = req.params;
    if (!id) {
      throw new BadRequestError("Thiếu thông tin sản phẩm");
    }
    const findProduct = await productModel.findById(id);
    if (!findProduct) {
      throw new NotFoundError("Xóa sản phẩm thất bại");
    }

    for (const image of findProduct.imagesProduct) {
      await cloudinary.uploader.destroy(getPublicId(image));
    }

    await findProduct.deleteOne();

    return new OK({
      message: "Xóa sản phẩm thành công",
      metadata: findProduct,
    }).send(res);
  }
}

module.exports = new ProductController();
