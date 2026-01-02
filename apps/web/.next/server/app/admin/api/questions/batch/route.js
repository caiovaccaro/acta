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
exports.id = "app/admin/api/questions/batch/route";
exports.ids = ["app/admin/api/questions/batch/route"];
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

/***/ "(rsc)/../../node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fadmin%2Fapi%2Fquestions%2Fbatch%2Froute&page=%2Fadmin%2Fapi%2Fquestions%2Fbatch%2Froute&appPaths=&pagePath=private-next-app-dir%2Fadmin%2Fapi%2Fquestions%2Fbatch%2Froute.ts&appDir=%2FUsers%2Fcaiovaccaro%2FDocuments%2FSites%2Facta%2Fapps%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fcaiovaccaro%2FDocuments%2FSites%2Facta%2Fapps%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ../../node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fadmin%2Fapi%2Fquestions%2Fbatch%2Froute&page=%2Fadmin%2Fapi%2Fquestions%2Fbatch%2Froute&appPaths=&pagePath=private-next-app-dir%2Fadmin%2Fapi%2Fquestions%2Fbatch%2Froute.ts&appDir=%2FUsers%2Fcaiovaccaro%2FDocuments%2FSites%2Facta%2Fapps%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fcaiovaccaro%2FDocuments%2FSites%2Facta%2Fapps%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/../../node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/../../node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/../../node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_caiovaccaro_Documents_Sites_acta_apps_web_app_admin_api_questions_batch_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/admin/api/questions/batch/route.ts */ \"(rsc)/./app/admin/api/questions/batch/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/admin/api/questions/batch/route\",\n        pathname: \"/admin/api/questions/batch\",\n        filename: \"route\",\n        bundlePath: \"app/admin/api/questions/batch/route\"\n    },\n    resolvedPagePath: \"/Users/caiovaccaro/Documents/Sites/acta/apps/web/app/admin/api/questions/batch/route.ts\",\n    nextConfigOutput,\n    userland: _Users_caiovaccaro_Documents_Sites_acta_apps_web_app_admin_api_questions_batch_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/admin/api/questions/batch/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vbm9kZV9tb2R1bGVzL25leHQvZGlzdC9idWlsZC93ZWJwYWNrL2xvYWRlcnMvbmV4dC1hcHAtbG9hZGVyLmpzP25hbWU9YXBwJTJGYWRtaW4lMkZhcGklMkZxdWVzdGlvbnMlMkZiYXRjaCUyRnJvdXRlJnBhZ2U9JTJGYWRtaW4lMkZhcGklMkZxdWVzdGlvbnMlMkZiYXRjaCUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFkbWluJTJGYXBpJTJGcXVlc3Rpb25zJTJGYmF0Y2glMkZyb3V0ZS50cyZhcHBEaXI9JTJGVXNlcnMlMkZjYWlvdmFjY2FybyUyRkRvY3VtZW50cyUyRlNpdGVzJTJGYWN0YSUyRmFwcHMlMkZ3ZWIlMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGY2Fpb3ZhY2Nhcm8lMkZEb2N1bWVudHMlMkZTaXRlcyUyRmFjdGElMkZhcHBzJTJGd2ViJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBc0c7QUFDdkM7QUFDYztBQUN1QztBQUNwSDtBQUNBO0FBQ0E7QUFDQSx3QkFBd0IsZ0hBQW1CO0FBQzNDO0FBQ0EsY0FBYyx5RUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLGlFQUFpRTtBQUN6RTtBQUNBO0FBQ0EsV0FBVyw0RUFBVztBQUN0QjtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ3VIOztBQUV2SCIsInNvdXJjZXMiOlsid2VicGFjazovL0BhY3RhL3dlYi8/ZTQ1NyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLWtpbmRcIjtcbmltcG9ydCB7IHBhdGNoRmV0Y2ggYXMgX3BhdGNoRmV0Y2ggfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9saWIvcGF0Y2gtZmV0Y2hcIjtcbmltcG9ydCAqIGFzIHVzZXJsYW5kIGZyb20gXCIvVXNlcnMvY2Fpb3ZhY2Nhcm8vRG9jdW1lbnRzL1NpdGVzL2FjdGEvYXBwcy93ZWIvYXBwL2FkbWluL2FwaS9xdWVzdGlvbnMvYmF0Y2gvcm91dGUudHNcIjtcbi8vIFdlIGluamVjdCB0aGUgbmV4dENvbmZpZ091dHB1dCBoZXJlIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGVtIGluIHRoZSByb3V0ZVxuLy8gbW9kdWxlLlxuY29uc3QgbmV4dENvbmZpZ091dHB1dCA9IFwiXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYWRtaW4vYXBpL3F1ZXN0aW9ucy9iYXRjaC9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYWRtaW4vYXBpL3F1ZXN0aW9ucy9iYXRjaFwiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hZG1pbi9hcGkvcXVlc3Rpb25zL2JhdGNoL3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiL1VzZXJzL2NhaW92YWNjYXJvL0RvY3VtZW50cy9TaXRlcy9hY3RhL2FwcHMvd2ViL2FwcC9hZG1pbi9hcGkvcXVlc3Rpb25zL2JhdGNoL3JvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuY29uc3Qgb3JpZ2luYWxQYXRobmFtZSA9IFwiL2FkbWluL2FwaS9xdWVzdGlvbnMvYmF0Y2gvcm91dGVcIjtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgc2VydmVySG9va3MsXG4gICAgICAgIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgb3JpZ2luYWxQYXRobmFtZSwgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/../../node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fadmin%2Fapi%2Fquestions%2Fbatch%2Froute&page=%2Fadmin%2Fapi%2Fquestions%2Fbatch%2Froute&appPaths=&pagePath=private-next-app-dir%2Fadmin%2Fapi%2Fquestions%2Fbatch%2Froute.ts&appDir=%2FUsers%2Fcaiovaccaro%2FDocuments%2FSites%2Facta%2Fapps%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fcaiovaccaro%2FDocuments%2FSites%2Facta%2Fapps%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/admin/api/questions/batch/route.ts":
/*!************************************************!*\
  !*** ./app/admin/api/questions/batch/route.ts ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/../../node_modules/next/dist/api/server.js\");\n/* harmony import */ var _lib_prisma__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/prisma */ \"(rsc)/./lib/prisma.ts\");\n\n\nasync function POST(request) {\n    try {\n        const body = await request.json();\n        const { ids, action } = body; // action: 'approve' | 'reject'\n        if (!Array.isArray(ids) || ids.length === 0) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"Invalid request: ids must be a non-empty array\"\n            }, {\n                status: 400\n            });\n        }\n        if (action !== \"approve\" && action !== \"reject\") {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Invalid action: must be \"approve\" or \"reject\"'\n            }, {\n                status: 400\n            });\n        }\n        const updateData = {};\n        if (action === \"approve\") {\n            updateData.validationStatus = \"validated\";\n            updateData.isActive = true;\n        } else {\n            updateData.validationStatus = \"rejected\";\n            updateData.isActive = false;\n        }\n        const result = await _lib_prisma__WEBPACK_IMPORTED_MODULE_1__.prisma.question.updateMany({\n            where: {\n                id: {\n                    in: ids\n                }\n            },\n            data: updateData\n        });\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            success: true,\n            updated: result.count\n        });\n    } catch (error) {\n        console.error(\"Error batch updating questions:\", error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: \"Failed to batch update questions\"\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYWRtaW4vYXBpL3F1ZXN0aW9ucy9iYXRjaC9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7QUFBMkM7QUFDTDtBQUUvQixlQUFlRSxLQUFLQyxPQUFnQjtJQUN6QyxJQUFJO1FBQ0YsTUFBTUMsT0FBTyxNQUFNRCxRQUFRRSxJQUFJO1FBQy9CLE1BQU0sRUFBRUMsR0FBRyxFQUFFQyxNQUFNLEVBQUUsR0FBR0gsTUFBTSwrQkFBK0I7UUFFN0QsSUFBSSxDQUFDSSxNQUFNQyxPQUFPLENBQUNILFFBQVFBLElBQUlJLE1BQU0sS0FBSyxHQUFHO1lBQzNDLE9BQU9WLHFEQUFZQSxDQUFDSyxJQUFJLENBQ3RCO2dCQUFFTSxPQUFPO1lBQWlELEdBQzFEO2dCQUFFQyxRQUFRO1lBQUk7UUFFbEI7UUFFQSxJQUFJTCxXQUFXLGFBQWFBLFdBQVcsVUFBVTtZQUMvQyxPQUFPUCxxREFBWUEsQ0FBQ0ssSUFBSSxDQUN0QjtnQkFBRU0sT0FBTztZQUFnRCxHQUN6RDtnQkFBRUMsUUFBUTtZQUFJO1FBRWxCO1FBRUEsTUFBTUMsYUFBa0IsQ0FBQztRQUN6QixJQUFJTixXQUFXLFdBQVc7WUFDeEJNLFdBQVdDLGdCQUFnQixHQUFHO1lBQzlCRCxXQUFXRSxRQUFRLEdBQUc7UUFDeEIsT0FBTztZQUNMRixXQUFXQyxnQkFBZ0IsR0FBRztZQUM5QkQsV0FBV0UsUUFBUSxHQUFHO1FBQ3hCO1FBRUEsTUFBTUMsU0FBUyxNQUFNZiwrQ0FBTUEsQ0FBQ2dCLFFBQVEsQ0FBQ0MsVUFBVSxDQUFDO1lBQzlDQyxPQUFPO2dCQUFFQyxJQUFJO29CQUFFQyxJQUFJZjtnQkFBSTtZQUFFO1lBQ3pCZ0IsTUFBTVQ7UUFDUjtRQUVBLE9BQU9iLHFEQUFZQSxDQUFDSyxJQUFJLENBQUM7WUFDdkJrQixTQUFTO1lBQ1RDLFNBQVNSLE9BQU9TLEtBQUs7UUFDdkI7SUFDRixFQUFFLE9BQU9kLE9BQU87UUFDZGUsUUFBUWYsS0FBSyxDQUFDLG1DQUFtQ0E7UUFDakQsT0FBT1gscURBQVlBLENBQUNLLElBQUksQ0FDdEI7WUFBRU0sT0FBTztRQUFtQyxHQUM1QztZQUFFQyxRQUFRO1FBQUk7SUFFbEI7QUFDRiIsInNvdXJjZXMiOlsid2VicGFjazovL0BhY3RhL3dlYi8uL2FwcC9hZG1pbi9hcGkvcXVlc3Rpb25zL2JhdGNoL3JvdXRlLnRzPzU1MjQiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV4dFJlc3BvbnNlIH0gZnJvbSAnbmV4dC9zZXJ2ZXInO1xuaW1wb3J0IHsgcHJpc21hIH0gZnJvbSAnQC9saWIvcHJpc21hJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIFBPU1QocmVxdWVzdDogUmVxdWVzdCkge1xuICB0cnkge1xuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZXF1ZXN0Lmpzb24oKTtcbiAgICBjb25zdCB7IGlkcywgYWN0aW9uIH0gPSBib2R5OyAvLyBhY3Rpb246ICdhcHByb3ZlJyB8ICdyZWplY3QnXG5cbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoaWRzKSB8fCBpZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oXG4gICAgICAgIHsgZXJyb3I6ICdJbnZhbGlkIHJlcXVlc3Q6IGlkcyBtdXN0IGJlIGEgbm9uLWVtcHR5IGFycmF5JyB9LFxuICAgICAgICB7IHN0YXR1czogNDAwIH1cbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKGFjdGlvbiAhPT0gJ2FwcHJvdmUnICYmIGFjdGlvbiAhPT0gJ3JlamVjdCcpIHtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihcbiAgICAgICAgeyBlcnJvcjogJ0ludmFsaWQgYWN0aW9uOiBtdXN0IGJlIFwiYXBwcm92ZVwiIG9yIFwicmVqZWN0XCInIH0sXG4gICAgICAgIHsgc3RhdHVzOiA0MDAgfVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zdCB1cGRhdGVEYXRhOiBhbnkgPSB7fTtcbiAgICBpZiAoYWN0aW9uID09PSAnYXBwcm92ZScpIHtcbiAgICAgIHVwZGF0ZURhdGEudmFsaWRhdGlvblN0YXR1cyA9ICd2YWxpZGF0ZWQnO1xuICAgICAgdXBkYXRlRGF0YS5pc0FjdGl2ZSA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHVwZGF0ZURhdGEudmFsaWRhdGlvblN0YXR1cyA9ICdyZWplY3RlZCc7XG4gICAgICB1cGRhdGVEYXRhLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcHJpc21hLnF1ZXN0aW9uLnVwZGF0ZU1hbnkoe1xuICAgICAgd2hlcmU6IHsgaWQ6IHsgaW46IGlkcyB9IH0sXG4gICAgICBkYXRhOiB1cGRhdGVEYXRhLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICB1cGRhdGVkOiByZXN1bHQuY291bnQsXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgYmF0Y2ggdXBkYXRpbmcgcXVlc3Rpb25zOicsIGVycm9yKTtcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oXG4gICAgICB7IGVycm9yOiAnRmFpbGVkIHRvIGJhdGNoIHVwZGF0ZSBxdWVzdGlvbnMnIH0sXG4gICAgICB7IHN0YXR1czogNTAwIH1cbiAgICApO1xuICB9XG59XG5cbiJdLCJuYW1lcyI6WyJOZXh0UmVzcG9uc2UiLCJwcmlzbWEiLCJQT1NUIiwicmVxdWVzdCIsImJvZHkiLCJqc29uIiwiaWRzIiwiYWN0aW9uIiwiQXJyYXkiLCJpc0FycmF5IiwibGVuZ3RoIiwiZXJyb3IiLCJzdGF0dXMiLCJ1cGRhdGVEYXRhIiwidmFsaWRhdGlvblN0YXR1cyIsImlzQWN0aXZlIiwicmVzdWx0IiwicXVlc3Rpb24iLCJ1cGRhdGVNYW55Iiwid2hlcmUiLCJpZCIsImluIiwiZGF0YSIsInN1Y2Nlc3MiLCJ1cGRhdGVkIiwiY291bnQiLCJjb25zb2xlIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/admin/api/questions/batch/route.ts\n");

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
var __webpack_require__ = require("../../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/dotenv"], () => (__webpack_exec__("(rsc)/../../node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fadmin%2Fapi%2Fquestions%2Fbatch%2Froute&page=%2Fadmin%2Fapi%2Fquestions%2Fbatch%2Froute&appPaths=&pagePath=private-next-app-dir%2Fadmin%2Fapi%2Fquestions%2Fbatch%2Froute.ts&appDir=%2FUsers%2Fcaiovaccaro%2FDocuments%2FSites%2Facta%2Fapps%2Fweb%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fcaiovaccaro%2FDocuments%2FSites%2Facta%2Fapps%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();