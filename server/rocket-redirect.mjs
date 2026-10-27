/** Keep old bookmarks working after Rocket moved to its dedicated droplet. */
export function registerRocketRedirect(app) {
  app.all(/^\/rocket(?:\/.*)?$/, (request, response) => {
    const suffix = request.originalUrl.slice('/rocket'.length)
    response.redirect(308, `https://rocket.planetarypixel.be${suffix.startsWith('/') ? suffix : '/' + suffix}`)
  })
}
