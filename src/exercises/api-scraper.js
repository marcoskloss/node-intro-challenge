const api = require('../products-api')
const { concurrentMap } = require('./concurrent-map')
const { delayedReturn } = require('./delayed-return')

const getProductsByCategory = async (category) => {
  const products = []
  let cursor = 0
  do {
    const { nextCursor, result } = await api.listProducts(category.id, cursor)
    cursor = nextCursor
    products.push(...result)
  } while(cursor != null)
  return products
}

const getAllProductsByCategory = async (categories) => {
  const products = []
  for (const category of categories) {
    const response = await getProductsByCategory(category)
    products.push(...response)
  }
  return products
}

/**
 * Retorna uma `Promise` com a lista detalhada de todos os produtos cadastrados da `products-api`.
 * Os produtos podem estar em qualquer ordem.
 *
 * @returns {Promise<{{id:string,name:string,price:number,description:string}}[]>} lista de produtos cadastrados
 */
const scrape = async () => {
  const categories = await api.listCategories()
  const products = await getAllProductsByCategory(categories)
  const productsDetails = products.map(product => api.getProduct(product.id))
  return Promise.all(productsDetails)
}

/**
 * Retorna uma `Promise` com a lista detalhada de todos os produtos cadastrados da `products-api`.
 * Os produtos podem estar em qualquer ordem.
 * Implementar otimizando velocidade de processamento, se aderindo as restrições de concorrência:
 * - api.listProducts: somente 2 chamadas simultâneas
 * - api.getProduct: somente 5 chamadas simultâneas
 *
 * @returns {Promise<{{id:string,name:string,price:number,description:string}}[]>} lista de produtos cadastrados
 */
const scrapeChallengeV2 = async () => {
  const listProductsMaxConcurrentCalls = 2
  const getProductMaxConcurrentCalls = 5

  const categories = await api.listCategories()

  const productsResponse = await concurrentMap(
    listProductsMaxConcurrentCalls,
    getProductsByCategory,
    categories
  )
  const products = productsResponse.flat()

  const getProductDetails = (product) => api.getProduct(product.id)
  const productDetails = await concurrentMap(
    getProductMaxConcurrentCalls,
    getProductDetails,
    products
  )
  return productDetails
}

/**
 * Retorna uma `Promise` com a lista detalhada de todos os produtos cadastrados da `products-api`.
 * Os produtos podem estar em qualquer ordem.
 * Implementar otimizando velocidade de processamento, se aderindo as restrições de concorrência:
 * - api.listProducts: somente 3 chamadas simultâneas
 * - api.getProduct: somente 1 chamada a cada 100ms
 *
 * @returns {Promise<{{id:string,name:string,price:number,description:string}}[]>} lista de produtos cadastrados
 */
const scrapeChallengeV3 = async () => {
  const listProductsMaxConcurrentCalls = 3
  const getProductDetailsDelay = 100

  const categories = await api.listCategories()

  const productsResponse = await concurrentMap(
    listProductsMaxConcurrentCalls,
    getProductsByCategory,
    categories
  )
  const products = productsResponse.flat()
  const delayedGetProductDetails = delayedReturn(
    getProductDetailsDelay,
    (product) => api.getProduct(product.id)
  )

  const productsDetails = []
  for (const product of products) {
    const productDetails = await delayedGetProductDetails(product)
    productsDetails.push(productDetails)
  }

  return productsDetails
}

module.exports = {
  scrape,
  scrapeChallengeV2,
  scrapeChallengeV3,
}
