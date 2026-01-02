"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/admin/api/verdicts/route";
exports.ids = ["app/admin/api/verdicts/route"];
exports.modules = {

/***/ "@prisma/client":
/*!*********************************!*\
  !*** external "@prisma/client" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("os");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ "(rsc)/../../node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fadmin%2Fapi%2Fverdicts%2Froute&page=%2Fadmin%2Fapi%2Fverdicts%2Froute&appPaths=&pagePath=private-next-app-dir%2Fadmin%2Fapi%2Fverdicts%2Froute.ts&appDir=%2FUsers%2Fcaiovaccaro%2FDocuments%2FSites%2Facta%2Fapps%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fcaiovaccaro%2FDocuments%2FSites%2Facta%2Fapps%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ../../node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fadmin%2Fapi%2Fverdicts%2Froute&page=%2Fadmin%2Fapi%2Fverdicts%2Froute&appPaths=&pagePath=private-next-app-dir%2Fadmin%2Fapi%2Fverdicts%2Froute.ts&appDir=%2FUsers%2Fcaiovaccaro%2FDocuments%2FSites%2Facta%2Fapps%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fcaiovaccaro%2FDocuments%2FSites%2Facta%2Fapps%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/../../node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/../../node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/../../node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_caiovaccaro_Documents_Sites_acta_apps_web_app_admin_api_verdicts_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/admin/api/verdicts/route.ts */ \"(rsc)/./app/admin/api/verdicts/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/admin/api/verdicts/route\",\n        pathname: \"/admin/api/verdicts\",\n        filename: \"route\",\n        bundlePath: \"app/admin/api/verdicts/route\"\n    },\n    resolvedPagePath: \"/Users/caiovaccaro/Documents/Sites/acta/apps/web/app/admin/api/verdicts/route.ts\",\n    nextConfigOutput,\n    userland: _Users_caiovaccaro_Documents_Sites_acta_apps_web_app_admin_api_verdicts_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/admin/api/verdicts/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vbm9kZV9tb2R1bGVzL25leHQvZGlzdC9idWlsZC93ZWJwYWNrL2xvYWRlcnMvbmV4dC1hcHAtbG9hZGVyLmpzP25hbWU9YXBwJTJGYWRtaW4lMkZhcGklMkZ2ZXJkaWN0cyUyRnJvdXRlJnBhZ2U9JTJGYWRtaW4lMkZhcGklMkZ2ZXJkaWN0cyUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFkbWluJTJGYXBpJTJGdmVyZGljdHMlMkZyb3V0ZS50cyZhcHBEaXI9JTJGVXNlcnMlMkZjYWlvdmFjY2FybyUyRkRvY3VtZW50cyUyRlNpdGVzJTJGYWN0YSUyRmFwcHMlMkZ3ZWIlMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGY2Fpb3ZhY2Nhcm8lMkZEb2N1bWVudHMlMkZTaXRlcyUyRmFjdGElMkZhcHBzJTJGd2ViJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBc0c7QUFDdkM7QUFDYztBQUNnQztBQUM3RztBQUNBO0FBQ0E7QUFDQSx3QkFBd0IsZ0hBQW1CO0FBQzNDO0FBQ0EsY0FBYyx5RUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLGlFQUFpRTtBQUN6RTtBQUNBO0FBQ0EsV0FBVyw0RUFBVztBQUN0QjtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ3VIOztBQUV2SCIsInNvdXJjZXMiOlsid2VicGFjazovL0BhY3RhL3dlYi8/YWViOCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLWtpbmRcIjtcbmltcG9ydCB7IHBhdGNoRmV0Y2ggYXMgX3BhdGNoRmV0Y2ggfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9saWIvcGF0Y2gtZmV0Y2hcIjtcbmltcG9ydCAqIGFzIHVzZXJsYW5kIGZyb20gXCIvVXNlcnMvY2Fpb3ZhY2Nhcm8vRG9jdW1lbnRzL1NpdGVzL2FjdGEvYXBwcy93ZWIvYXBwL2FkbWluL2FwaS92ZXJkaWN0cy9yb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hZG1pbi9hcGkvdmVyZGljdHMvcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FkbWluL2FwaS92ZXJkaWN0c1wiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hZG1pbi9hcGkvdmVyZGljdHMvcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCIvVXNlcnMvY2Fpb3ZhY2Nhcm8vRG9jdW1lbnRzL1NpdGVzL2FjdGEvYXBwcy93ZWIvYXBwL2FkbWluL2FwaS92ZXJkaWN0cy9yb3V0ZS50c1wiLFxuICAgIG5leHRDb25maWdPdXRwdXQsXG4gICAgdXNlcmxhbmRcbn0pO1xuLy8gUHVsbCBvdXQgdGhlIGV4cG9ydHMgdGhhdCB3ZSBuZWVkIHRvIGV4cG9zZSBmcm9tIHRoZSBtb2R1bGUuIFRoaXMgc2hvdWxkXG4vLyBiZSBlbGltaW5hdGVkIHdoZW4gd2UndmUgbW92ZWQgdGhlIG90aGVyIHJvdXRlcyB0byB0aGUgbmV3IGZvcm1hdC4gVGhlc2Vcbi8vIGFyZSB1c2VkIHRvIGhvb2sgaW50byB0aGUgcm91dGUuXG5jb25zdCB7IHJlcXVlc3RBc3luY1N0b3JhZ2UsIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmNvbnN0IG9yaWdpbmFsUGF0aG5hbWUgPSBcIi9hZG1pbi9hcGkvdmVyZGljdHMvcm91dGVcIjtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgc2VydmVySG9va3MsXG4gICAgICAgIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgb3JpZ2luYWxQYXRobmFtZSwgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/../../node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fadmin%2Fapi%2Fverdicts%2Froute&page=%2Fadmin%2Fapi%2Fverdicts%2Froute&appPaths=&pagePath=private-next-app-dir%2Fadmin%2Fapi%2Fverdicts%2Froute.ts&appDir=%2FUsers%2Fcaiovaccaro%2FDocuments%2FSites%2Facta%2Fapps%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fcaiovaccaro%2FDocuments%2FSites%2Facta%2Fapps%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/admin/api/verdicts/route.ts":
/*!*****************************************!*\
  !*** ./app/admin/api/verdicts/route.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/../../node_modules/next/dist/api/server.js\");\n/* harmony import */ var _lib_prisma__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/prisma */ \"(rsc)/./lib/prisma.ts\");\n\n\nasync function GET() {\n    try {\n        const verdicts = await _lib_prisma__WEBPACK_IMPORTED_MODULE_1__.prisma.verdict.findMany({\n            orderBy: {\n                month: \"desc\"\n            },\n            include: {\n                question: {\n                    include: {\n                        topic: true,\n                        articleStances: {\n                            include: {\n                                article: {\n                                    include: {\n                                        outlet: true\n                                    }\n                                }\n                            }\n                        }\n                    }\n                }\n            }\n        });\n        // Calculate article and outlet counts for each verdict\n        const verdictsWithCounts = verdicts.map((verdict)=>{\n            const articleIds = new Set(verdict.question.articleStances.map((as)=>as.article.id));\n            const outletIds = new Set(verdict.question.articleStances.map((as)=>as.article.outlet.id));\n            return {\n                ...verdict,\n                _count: {\n                    articles: articleIds.size,\n                    outlets: outletIds.size\n                }\n            };\n        });\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(verdictsWithCounts);\n    } catch (error) {\n        console.error(\"Error fetching verdicts:\", error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: \"Failed to fetch verdicts\"\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYWRtaW4vYXBpL3ZlcmRpY3RzL3JvdXRlLnRzIiwibWFwcGluZ3MiOiI7Ozs7OztBQUEyQztBQUNMO0FBRS9CLGVBQWVFO0lBQ3BCLElBQUk7UUFDRixNQUFNQyxXQUFXLE1BQU1GLCtDQUFNQSxDQUFDRyxPQUFPLENBQUNDLFFBQVEsQ0FBQztZQUM3Q0MsU0FBUztnQkFBRUMsT0FBTztZQUFPO1lBQ3pCQyxTQUFTO2dCQUNQQyxVQUFVO29CQUNSRCxTQUFTO3dCQUNQRSxPQUFPO3dCQUNQQyxnQkFBZ0I7NEJBQ2RILFNBQVM7Z0NBQ1BJLFNBQVM7b0NBQ1BKLFNBQVM7d0NBQ1BLLFFBQVE7b0NBQ1Y7Z0NBQ0Y7NEJBQ0Y7d0JBQ0Y7b0JBQ0Y7Z0JBQ0Y7WUFDRjtRQUNGO1FBRUEsdURBQXVEO1FBQ3ZELE1BQU1DLHFCQUFxQlgsU0FBU1ksR0FBRyxDQUFDWCxDQUFBQTtZQUN0QyxNQUFNWSxhQUFhLElBQUlDLElBQ3JCYixRQUFRSyxRQUFRLENBQUNFLGNBQWMsQ0FBQ0ksR0FBRyxDQUFDRyxDQUFBQSxLQUFNQSxHQUFHTixPQUFPLENBQUNPLEVBQUU7WUFFekQsTUFBTUMsWUFBWSxJQUFJSCxJQUNwQmIsUUFBUUssUUFBUSxDQUFDRSxjQUFjLENBQUNJLEdBQUcsQ0FBQ0csQ0FBQUEsS0FBTUEsR0FBR04sT0FBTyxDQUFDQyxNQUFNLENBQUNNLEVBQUU7WUFHaEUsT0FBTztnQkFDTCxHQUFHZixPQUFPO2dCQUNWaUIsUUFBUTtvQkFDTkMsVUFBVU4sV0FBV08sSUFBSTtvQkFDekJDLFNBQVNKLFVBQVVHLElBQUk7Z0JBQ3pCO1lBQ0Y7UUFDRjtRQUVBLE9BQU92QixxREFBWUEsQ0FBQ3lCLElBQUksQ0FBQ1g7SUFDM0IsRUFBRSxPQUFPWSxPQUFPO1FBQ2RDLFFBQVFELEtBQUssQ0FBQyw0QkFBNEJBO1FBQzFDLE9BQU8xQixxREFBWUEsQ0FBQ3lCLElBQUksQ0FDdEI7WUFBRUMsT0FBTztRQUEyQixHQUNwQztZQUFFRSxRQUFRO1FBQUk7SUFFbEI7QUFDRiIsInNvdXJjZXMiOlsid2VicGFjazovL0BhY3RhL3dlYi8uL2FwcC9hZG1pbi9hcGkvdmVyZGljdHMvcm91dGUudHM/MjkwMSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXh0UmVzcG9uc2UgfSBmcm9tICduZXh0L3NlcnZlcic7XG5pbXBvcnQgeyBwcmlzbWEgfSBmcm9tICdAL2xpYi9wcmlzbWEnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gR0VUKCkge1xuICB0cnkge1xuICAgIGNvbnN0IHZlcmRpY3RzID0gYXdhaXQgcHJpc21hLnZlcmRpY3QuZmluZE1hbnkoe1xuICAgICAgb3JkZXJCeTogeyBtb250aDogJ2Rlc2MnIH0sXG4gICAgICBpbmNsdWRlOiB7XG4gICAgICAgIHF1ZXN0aW9uOiB7XG4gICAgICAgICAgaW5jbHVkZToge1xuICAgICAgICAgICAgdG9waWM6IHRydWUsXG4gICAgICAgICAgICBhcnRpY2xlU3RhbmNlczoge1xuICAgICAgICAgICAgICBpbmNsdWRlOiB7XG4gICAgICAgICAgICAgICAgYXJ0aWNsZToge1xuICAgICAgICAgICAgICAgICAgaW5jbHVkZToge1xuICAgICAgICAgICAgICAgICAgICBvdXRsZXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQ2FsY3VsYXRlIGFydGljbGUgYW5kIG91dGxldCBjb3VudHMgZm9yIGVhY2ggdmVyZGljdFxuICAgIGNvbnN0IHZlcmRpY3RzV2l0aENvdW50cyA9IHZlcmRpY3RzLm1hcCh2ZXJkaWN0ID0+IHtcbiAgICAgIGNvbnN0IGFydGljbGVJZHMgPSBuZXcgU2V0KFxuICAgICAgICB2ZXJkaWN0LnF1ZXN0aW9uLmFydGljbGVTdGFuY2VzLm1hcChhcyA9PiBhcy5hcnRpY2xlLmlkKVxuICAgICAgKTtcbiAgICAgIGNvbnN0IG91dGxldElkcyA9IG5ldyBTZXQoXG4gICAgICAgIHZlcmRpY3QucXVlc3Rpb24uYXJ0aWNsZVN0YW5jZXMubWFwKGFzID0+IGFzLmFydGljbGUub3V0bGV0LmlkKVxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4udmVyZGljdCxcbiAgICAgICAgX2NvdW50OiB7XG4gICAgICAgICAgYXJ0aWNsZXM6IGFydGljbGVJZHMuc2l6ZSxcbiAgICAgICAgICBvdXRsZXRzOiBvdXRsZXRJZHMuc2l6ZSxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24odmVyZGljdHNXaXRoQ291bnRzKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBmZXRjaGluZyB2ZXJkaWN0czonLCBlcnJvcik7XG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxuICAgICAgeyBlcnJvcjogJ0ZhaWxlZCB0byBmZXRjaCB2ZXJkaWN0cycgfSxcbiAgICAgIHsgc3RhdHVzOiA1MDAgfVxuICAgICk7XG4gIH1cbn1cblxuIl0sIm5hbWVzIjpbIk5leHRSZXNwb25zZSIsInByaXNtYSIsIkdFVCIsInZlcmRpY3RzIiwidmVyZGljdCIsImZpbmRNYW55Iiwib3JkZXJCeSIsIm1vbnRoIiwiaW5jbHVkZSIsInF1ZXN0aW9uIiwidG9waWMiLCJhcnRpY2xlU3RhbmNlcyIsImFydGljbGUiLCJvdXRsZXQiLCJ2ZXJkaWN0c1dpdGhDb3VudHMiLCJtYXAiLCJhcnRpY2xlSWRzIiwiU2V0IiwiYXMiLCJpZCIsIm91dGxldElkcyIsIl9jb3VudCIsImFydGljbGVzIiwic2l6ZSIsIm91dGxldHMiLCJqc29uIiwiZXJyb3IiLCJjb25zb2xlIiwic3RhdHVzIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/admin/api/verdicts/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/prisma.ts":
/*!***********************!*\
  !*** ./lib/prisma.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   prisma: () => (/* binding */ prisma)\n/* harmony export */ });\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @prisma/client */ \"@prisma/client\");\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_prisma_client__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var dotenv__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! dotenv */ \"(rsc)/../../node_modules/dotenv/lib/main.js\");\n/* harmony import */ var dotenv__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(dotenv__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! path */ \"path\");\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_2__);\n\n\n\n// Load environment variables from root .env file\nconst projectRoot = (0,path__WEBPACK_IMPORTED_MODULE_2__.resolve)(process.cwd(), \"../..\");\nconst envPath = (0,path__WEBPACK_IMPORTED_MODULE_2__.resolve)(projectRoot, \".env\");\n(0,dotenv__WEBPACK_IMPORTED_MODULE_1__.config)({\n    path: envPath\n});\n// PrismaClient is attached to the `global` object in development to prevent\n// exhausting your database connection limit.\n// Learn more: https://pris.ly/d/help/next-js-best-practices\nconst globalForPrisma = globalThis;\nconst prisma = globalForPrisma.prisma ?? new _prisma_client__WEBPACK_IMPORTED_MODULE_0__.PrismaClient({\n    log:  true ? [\n        \"query\",\n        \"error\",\n        \"warn\"\n    ] : 0\n});\nif (true) globalForPrisma.prisma = prisma;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvcHJpc21hLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBOEM7QUFDZDtBQUNEO0FBRS9CLGlEQUFpRDtBQUNqRCxNQUFNRyxjQUFjRCw2Q0FBT0EsQ0FBQ0UsUUFBUUMsR0FBRyxJQUFJO0FBQzNDLE1BQU1DLFVBQVVKLDZDQUFPQSxDQUFDQyxhQUFhO0FBQ3JDRiw4Q0FBTUEsQ0FBQztJQUFFTSxNQUFNRDtBQUFRO0FBRXZCLDRFQUE0RTtBQUM1RSw2Q0FBNkM7QUFDN0MsNERBQTREO0FBRTVELE1BQU1FLGtCQUFrQkM7QUFJakIsTUFBTUMsU0FDWEYsZ0JBQWdCRSxNQUFNLElBQ3RCLElBQUlWLHdEQUFZQSxDQUFDO0lBQ2ZXLEtBQUtQLEtBQXlCLEdBQWdCO1FBQUM7UUFBUztRQUFTO0tBQU8sR0FBRyxDQUFTO0FBQ3RGLEdBQUc7QUFFTCxJQUFJQSxJQUF5QixFQUFjSSxnQkFBZ0JFLE1BQU0sR0FBR0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9AYWN0YS93ZWIvLi9saWIvcHJpc21hLnRzPzk4MjIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUHJpc21hQ2xpZW50IH0gZnJvbSAnQHByaXNtYS9jbGllbnQnO1xuaW1wb3J0IHsgY29uZmlnIH0gZnJvbSAnZG90ZW52JztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcblxuLy8gTG9hZCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZnJvbSByb290IC5lbnYgZmlsZVxuY29uc3QgcHJvamVjdFJvb3QgPSByZXNvbHZlKHByb2Nlc3MuY3dkKCksICcuLi8uLicpO1xuY29uc3QgZW52UGF0aCA9IHJlc29sdmUocHJvamVjdFJvb3QsICcuZW52Jyk7XG5jb25maWcoeyBwYXRoOiBlbnZQYXRoIH0pO1xuXG4vLyBQcmlzbWFDbGllbnQgaXMgYXR0YWNoZWQgdG8gdGhlIGBnbG9iYWxgIG9iamVjdCBpbiBkZXZlbG9wbWVudCB0byBwcmV2ZW50XG4vLyBleGhhdXN0aW5nIHlvdXIgZGF0YWJhc2UgY29ubmVjdGlvbiBsaW1pdC5cbi8vIExlYXJuIG1vcmU6IGh0dHBzOi8vcHJpcy5seS9kL2hlbHAvbmV4dC1qcy1iZXN0LXByYWN0aWNlc1xuXG5jb25zdCBnbG9iYWxGb3JQcmlzbWEgPSBnbG9iYWxUaGlzIGFzIHVua25vd24gYXMge1xuICBwcmlzbWE6IFByaXNtYUNsaWVudCB8IHVuZGVmaW5lZDtcbn07XG5cbmV4cG9ydCBjb25zdCBwcmlzbWEgPVxuICBnbG9iYWxGb3JQcmlzbWEucHJpc21hID8/XG4gIG5ldyBQcmlzbWFDbGllbnQoe1xuICAgIGxvZzogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdkZXZlbG9wbWVudCcgPyBbJ3F1ZXJ5JywgJ2Vycm9yJywgJ3dhcm4nXSA6IFsnZXJyb3InXSxcbiAgfSk7XG5cbmlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSBnbG9iYWxGb3JQcmlzbWEucHJpc21hID0gcHJpc21hO1xuIl0sIm5hbWVzIjpbIlByaXNtYUNsaWVudCIsImNvbmZpZyIsInJlc29sdmUiLCJwcm9qZWN0Um9vdCIsInByb2Nlc3MiLCJjd2QiLCJlbnZQYXRoIiwicGF0aCIsImdsb2JhbEZvclByaXNtYSIsImdsb2JhbFRoaXMiLCJwcmlzbWEiLCJsb2ciXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./lib/prisma.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/dotenv"], () => (__webpack_exec__("(rsc)/../../node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fadmin%2Fapi%2Fverdicts%2Froute&page=%2Fadmin%2Fapi%2Fverdicts%2Froute&appPaths=&pagePath=private-next-app-dir%2Fadmin%2Fapi%2Fverdicts%2Froute.ts&appDir=%2FUsers%2Fcaiovaccaro%2FDocuments%2FSites%2Facta%2Fapps%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fcaiovaccaro%2FDocuments%2FSites%2Facta%2Fapps%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();