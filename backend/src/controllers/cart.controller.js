const { BadRequestError } = require("../core/error.response");
const { Created } = require("../core/success.response");
const cartModel = require("../models/cart.model");
const productModel = require("../models/product.model");

// function calculateFinalPrice(cart, productsData) {
//   let toalPrice = 0;
//   for (const product of produtsData) {
//     let discount = 0;
//     const product = productsData.find(
//       (p) => p._id.toString() === product.productId.toString()
//     );

//     const discountedPrice =
//       product.priceProduct * (1 - (product.discountProduct || 0) / 100);
//     toalPrice += discountedPrice * product.quantity;
//   }
// }

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

    const allProductIds = findCartUser.products.map(
      (product) => product.productId
    );

    const productsData = await productModel.find({
      _id: { $in: allProductIds },
    });

    let totalPrice = 0;

    findCartUser.products.forEach((p) => {
      const product = productsData.find((prod) => {
        return prod._id.toString() === p.productId.toString();
      });
      if (product) {
        const priceAfterProduct =
          (product.priceProduct * product.discountProduct) / 100;
        totalPrice += priceAfterProduct * p.quantity;
      }
    });

    findCartUser.totalPrice = totalPrice;
    await findCartUser.save();

    return new Created({
      message: "Thêm vào giỏ hàng thành công",
      metadata: findCartUser,
    }).send(res);
  }
}

module.exports = new CartController();
