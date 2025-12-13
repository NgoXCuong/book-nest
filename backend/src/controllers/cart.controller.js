const { BadRequestError, NotFoundError } = require("../core/error.response");
const { Created, OK } = require("../core/success.response");
const cartModel = require("../models/cart.model");
const productModel = require("../models/product.model");
const couponModel = require("../models/coupon.model");

async function calculateTotalPrice(findCartUser) {
  const allProductIds = findCartUser.products.map((p) => p.productId);

  const productsData = await productModel.find({ _id: { $in: allProductIds } });

  let totalPrice = 0;

  findCartUser.products.forEach((p) => {
    const product = productsData.find(
      (prod) => prod._id.toString() === p.productId.toString()
    );
    if (product) {
      const priceAfterDiscount =
        product.priceProduct -
        (product.priceProduct * product.discountProduct) / 100;
      totalPrice += priceAfterDiscount * p.quantity;
    }
  });

  findCartUser.totalPrice = totalPrice;
  await findCartUser.save();

  return totalPrice;
}

class CartController {
  async createCart(req, res) {
    const id = req.user;
    const { productId, quantity } = req.body;

    if (!id || !productId || !Number(quantity)) {
      throw new BadRequestError("Thiếu thông tin cần thiết");
    }

    const findProductDb = await productModel.findById(productId);
    if (!findProductDb) {
      throw new BadRequestError("Sản phẩm không tồn tại");
    }

    if (findProductDb.stockProduct < Number(quantity)) {
      throw new BadRequestError("Số lượng sản phẩm không đủ");
    }

    let findCartUser = await cartModel.findOne({ userId: id });
    if (!findCartUser) {
      findCartUser = await cartModel.create({
        userId: id,
        products: [{ productId, quantity: Number(quantity) }],
      });
      await findProductDb.updateOne({
        $inc: { stockProduct: -Number(quantity) },
      });
    } else {
      const findProduct = findCartUser.products.find(
        (product) => product.productId.toString() === productId
      );
      if (findProduct) {
        findProduct.quantity += Number(quantity);
        await findProductDb.updateOne({
          $inc: { stockProduct: -Number(quantity) },
        });
      } else {
        findCartUser.products.push({ productId, quantity: Number(quantity) });
        await findProductDb.updateOne({
          $inc: { stockProduct: -Number(quantity) },
        });
      }
      await findCartUser.save();
    }

    await calculateTotalPrice(findCartUser);

    return new Created({
      message: "Thêm vào giỏ hàng thành công",
      metadata: findCartUser,
    }).send(res);
  }

  async updateCart(req, res) {
    const id = req.user;
    const { productId, newQuantity } = req.body;

    if (!id || !productId) {
      throw new BadRequestError("Thiếu thông tin cần thiết của giỏ hàng");
    }

    const findCartUser = await cartModel.findOne({ userId: id });
    if (!findCartUser) {
      throw new NotFoundError("Giỏ hàng không tồn tại");
    }

    const findProductInCart = findCartUser.products.find(
      (product) => product.productId.toString() === productId
    );

    if (!findProductInCart) {
      throw new NotFoundError("Sản phẩm không tồn tại trong giỏ hàng");
    }

    const productDb = await productModel.findById(productId);
    if (!productDb) {
      throw new NotFoundError("Sản phẩm không tồn tại");
    }

    const currentQuantity = findProductInCart.quantity;

    if (Number(newQuantity) === 0) {
      productDb.stockProduct += currentQuantity;
      findCartUser.products = findCartUser.products.filter(
        (product) => product.productId.toString() !== productId
      );
      await productDb.save();
      await findCartUser.save();
    } else if (Number(newQuantity) > currentQuantity) {
      const addQuantity = Number(newQuantity) - currentQuantity;

      if (productDb.stockProduct < addQuantity) {
        throw new BadRequestError("Số lượng sản phẩm không đủ");
      }

      findProductInCart.quantity = Number(newQuantity);
      productDb.stockProduct -= addQuantity;
      await productDb.save();
    } else if (Number(newQuantity) < currentQuantity) {
      const removeQuantity = currentQuantity - Number(newQuantity);
      findProductInCart.quantity = Number(newQuantity);
      productDb.stockProduct += removeQuantity;
      await productDb.save();
    }

    await calculateTotalPrice(findCartUser);

    return new OK({
      message: "Cập nhật giỏ hàng thành công",
      metadata: findCartUser,
    }).send(res);
  }

  async deleteProductInCart(req, res) {
    const id = req.user;
    const { productId } = req.params;

    if (!id || !productId) {
      throw new BadRequestError("Thiếu thông tin giỏ hàng");
    }

    const findCartUser = await cartModel.findOne({ userId: id });

    if (!findCartUser) {
      throw new NotFoundError("Giỏ hàng không tồn tại");
    }

    const findProductInCart = findCartUser.products.find(
      (p) => p.productId.toString() === productId
    );

    if (!findProductInCart) {
      throw new NotFoundError("Sản phẩm không tồn tại trong giỏ hàng");
    }

    const productDb = await productModel.findById(productId);
    if (!productDb) {
      throw new NotFoundError("Sản phẩm không tồn tại");
    }

    findCartUser.products = findCartUser.products.filter(
      (p) => p.productId.toString() !== productId
    );

    productDb.stockProduct += findProductInCart.quantity;
    await productDb.save();

    await calculateTotalPrice(findCartUser);

    return new OK({
      message: "Xóa sản phẩm khỏi giỏ hàng thành công",
      metadata: findCartUser,
    }).send(res);
  }

  async getCartInUser(req, res) {
    const id = req.user;

    const findCartUser = await cartModel
      .findOne({ userId: id })
      .populate("products.productId");

    const today = new Date();

    const coupons = await couponModel.find({
      startDate: { $lte: today },
      endDate: { $gte: today },
      minPrice: { $lte: findCartUser.totalPrice },
      quantity: { $gt: 0 },
    });

    if (!findCartUser) {
      const newCart = await cartModel.create({
        userId: id,
        products: [],
        coupons: coupons,
      });
      return new OK({
        message: "Lấy giỏ hàng thành công",
        metadata: { cart: newCart, coupons },
      }).send(res);
    }

    return new OK({
      message: "Lấy giỏ hàng thành công",
      metadata: { cart: findCartUser, coupons },
    }).send(res);
  }

  async updateInfoCart(req, res) {
    const id = req.user;
    const { fullName, phoneNumber, address, email } = req.body;

    if (!id || !fullName || !phoneNumber || !address || !email) {
      throw new BadRequestError("Thiếu thông tin giỏ hàng");
    }

    const findCartUser = await cartModel.findOne({ userId: id });
    if (!findCartUser) {
      throw new NotFoundError("Giỏ hàng không tồn tại");
    }

    findCartUser.fullName = fullName;
    findCartUser.phoneNumber = phoneNumber;
    findCartUser.address = address;
    findCartUser.email = email;
    await findCartUser.save();

    return new OK({
      message: "Cập nhật thông tin giỏ hàng thành công",
      metadata: findCartUser,
    }).send(res);
  }
}

module.exports = new CartController();
