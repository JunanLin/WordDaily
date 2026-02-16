/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (function() { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./worker/index.ts":
/*!*************************!*\
  !*** ./worker/index.ts ***!
  \*************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

eval(__webpack_require__.ts("// @ts-nocheck\n/// <reference lib=\"WebWorker\" />\n// To disable all console logs in production, you can set this to false\nconst debug = true;\nself.addEventListener(\"push\", (event)=>{\n    if (debug) console.log(\"[Service Worker] Push Received.\");\n    if (!event.data) {\n        if (debug) console.log(\"[Service Worker] Push event but no data\");\n        return;\n    }\n    try {\n        const data = event.data.json();\n        const title = data.title || \"WordDaily\";\n        const options = {\n            body: data.body || \"You have a new notification!\",\n            icon: \"/icons/icon-192x192.png\",\n            badge: \"/icons/icon-192x192.png\",\n            data: {\n                url: data.url || \"/\"\n            }\n        };\n        event.waitUntil(self.registration.showNotification(title, options));\n    } catch (err) {\n        if (debug) console.error(\"[Service Worker] Error parsing push data:\", err);\n        // Fallback for plain text\n        const text = event.data.text();\n        event.waitUntil(self.registration.showNotification(\"WordDaily\", {\n            body: text,\n            icon: \"/icons/icon-192x192.png\"\n        }));\n    }\n});\nself.addEventListener(\"notificationclick\", (event)=>{\n    var _event_notification_data;\n    if (debug) console.log(\"[Service Worker] Notification click Received.\");\n    event.notification.close();\n    const urlToOpen = ((_event_notification_data = event.notification.data) === null || _event_notification_data === void 0 ? void 0 : _event_notification_data.url) || \"/\";\n    event.waitUntil(self.clients.matchAll({\n        type: \"window\",\n        includeUncontrolled: true\n    }).then((windowClients)=>{\n        // Check if there is already a window open and focus it of not\n        for(let i = 0; i < windowClients.length; i++){\n            const client = windowClients[i];\n            if (client.url === urlToOpen && \"focus\" in client) {\n                return client.focus();\n            }\n        }\n        // If not, then open a new window\n        if (self.clients.openWindow) {\n            return self.clients.openWindow(urlToOpen);\n        }\n    }));\n});\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                /* unsupported import.meta.webpackHot */ undefined.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi93b3JrZXIvaW5kZXgudHMiLCJtYXBwaW5ncyI6IkFBQUEsY0FBYztBQUNkLGlDQUFpQztBQUlqQyx1RUFBdUU7QUFDdkUsTUFBTUEsUUFBUTtBQUVkQyxLQUFLQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUNDO0lBQzNCLElBQUlILE9BQU9JLFFBQVFDLEdBQUcsQ0FBQztJQUV2QixJQUFJLENBQUNGLE1BQU1HLElBQUksRUFBRTtRQUNiLElBQUlOLE9BQU9JLFFBQVFDLEdBQUcsQ0FBQztRQUN2QjtJQUNKO0lBRUEsSUFBSTtRQUNBLE1BQU1DLE9BQU9ILE1BQU1HLElBQUksQ0FBQ0MsSUFBSTtRQUM1QixNQUFNQyxRQUFRRixLQUFLRSxLQUFLLElBQUk7UUFDNUIsTUFBTUMsVUFBVTtZQUNaQyxNQUFNSixLQUFLSSxJQUFJLElBQUk7WUFDbkJDLE1BQU07WUFDTkMsT0FBTztZQUNQTixNQUFNO2dCQUNGTyxLQUFLUCxLQUFLTyxHQUFHLElBQUk7WUFDckI7UUFDSjtRQUVBVixNQUFNVyxTQUFTLENBQUNiLEtBQUtjLFlBQVksQ0FBQ0MsZ0JBQWdCLENBQUNSLE9BQU9DO0lBQzlELEVBQUUsT0FBT1EsS0FBSztRQUNWLElBQUlqQixPQUFPSSxRQUFRYyxLQUFLLENBQUMsNkNBQTZDRDtRQUV0RSwwQkFBMEI7UUFDMUIsTUFBTUUsT0FBT2hCLE1BQU1HLElBQUksQ0FBQ2EsSUFBSTtRQUM1QmhCLE1BQU1XLFNBQVMsQ0FBQ2IsS0FBS2MsWUFBWSxDQUFDQyxnQkFBZ0IsQ0FBQyxhQUFhO1lBQzVETixNQUFNUztZQUNOUixNQUFNO1FBQ1Y7SUFDSjtBQUNKO0FBRUFWLEtBQUtDLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDQztRQUt0QkE7SUFKbEIsSUFBSUgsT0FBT0ksUUFBUUMsR0FBRyxDQUFDO0lBRXZCRixNQUFNaUIsWUFBWSxDQUFDQyxLQUFLO0lBRXhCLE1BQU1DLFlBQVluQixFQUFBQSwyQkFBQUEsTUFBTWlCLFlBQVksQ0FBQ2QsSUFBSSxjQUF2QkgsK0NBQUFBLHlCQUF5QlUsR0FBRyxLQUFJO0lBRWxEVixNQUFNVyxTQUFTLENBQ1hiLEtBQUtzQixPQUFPLENBQUNDLFFBQVEsQ0FBQztRQUFFQyxNQUFNO1FBQVVDLHFCQUFxQjtJQUFLLEdBQUdDLElBQUksQ0FBQyxDQUFDQztRQUN2RSw4REFBOEQ7UUFDOUQsSUFBSyxJQUFJQyxJQUFJLEdBQUdBLElBQUlELGNBQWNFLE1BQU0sRUFBRUQsSUFBSztZQUMzQyxNQUFNRSxTQUFTSCxhQUFhLENBQUNDLEVBQUU7WUFDL0IsSUFBSUUsT0FBT2xCLEdBQUcsS0FBS1MsYUFBYSxXQUFXUyxRQUFRO2dCQUMvQyxPQUFPQSxPQUFPQyxLQUFLO1lBQ3ZCO1FBQ0o7UUFDQSxpQ0FBaUM7UUFDakMsSUFBSS9CLEtBQUtzQixPQUFPLENBQUNVLFVBQVUsRUFBRTtZQUN6QixPQUFPaEMsS0FBS3NCLE9BQU8sQ0FBQ1UsVUFBVSxDQUFDWDtRQUNuQztJQUNKO0FBRVIiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vd29ya2VyL2luZGV4LnRzP2VjYmUiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQHRzLW5vY2hlY2tcbi8vLyA8cmVmZXJlbmNlIGxpYj1cIldlYldvcmtlclwiIC8+XG5cbmRlY2xhcmUgbGV0IHNlbGY6IFNlcnZpY2VXb3JrZXJHbG9iYWxTY29wZTtcblxuLy8gVG8gZGlzYWJsZSBhbGwgY29uc29sZSBsb2dzIGluIHByb2R1Y3Rpb24sIHlvdSBjYW4gc2V0IHRoaXMgdG8gZmFsc2VcbmNvbnN0IGRlYnVnID0gdHJ1ZTtcblxuc2VsZi5hZGRFdmVudExpc3RlbmVyKCdwdXNoJywgKGV2ZW50KSA9PiB7XG4gICAgaWYgKGRlYnVnKSBjb25zb2xlLmxvZygnW1NlcnZpY2UgV29ya2VyXSBQdXNoIFJlY2VpdmVkLicpO1xuXG4gICAgaWYgKCFldmVudC5kYXRhKSB7XG4gICAgICAgIGlmIChkZWJ1ZykgY29uc29sZS5sb2coJ1tTZXJ2aWNlIFdvcmtlcl0gUHVzaCBldmVudCBidXQgbm8gZGF0YScpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3QgZGF0YSA9IGV2ZW50LmRhdGEuanNvbigpO1xuICAgICAgICBjb25zdCB0aXRsZSA9IGRhdGEudGl0bGUgfHwgJ1dvcmREYWlseSc7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICBib2R5OiBkYXRhLmJvZHkgfHwgJ1lvdSBoYXZlIGEgbmV3IG5vdGlmaWNhdGlvbiEnLFxuICAgICAgICAgICAgaWNvbjogJy9pY29ucy9pY29uLTE5MngxOTIucG5nJyxcbiAgICAgICAgICAgIGJhZGdlOiAnL2ljb25zL2ljb24tMTkyeDE5Mi5wbmcnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHVybDogZGF0YS51cmwgfHwgJy8nXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgZXZlbnQud2FpdFVudGlsKHNlbGYucmVnaXN0cmF0aW9uLnNob3dOb3RpZmljYXRpb24odGl0bGUsIG9wdGlvbnMpKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgaWYgKGRlYnVnKSBjb25zb2xlLmVycm9yKCdbU2VydmljZSBXb3JrZXJdIEVycm9yIHBhcnNpbmcgcHVzaCBkYXRhOicsIGVycik7XG5cbiAgICAgICAgLy8gRmFsbGJhY2sgZm9yIHBsYWluIHRleHRcbiAgICAgICAgY29uc3QgdGV4dCA9IGV2ZW50LmRhdGEudGV4dCgpO1xuICAgICAgICBldmVudC53YWl0VW50aWwoc2VsZi5yZWdpc3RyYXRpb24uc2hvd05vdGlmaWNhdGlvbignV29yZERhaWx5Jywge1xuICAgICAgICAgICAgYm9keTogdGV4dCxcbiAgICAgICAgICAgIGljb246ICcvaWNvbnMvaWNvbi0xOTJ4MTkyLnBuZycsXG4gICAgICAgIH0pKTtcbiAgICB9XG59KTtcblxuc2VsZi5hZGRFdmVudExpc3RlbmVyKCdub3RpZmljYXRpb25jbGljaycsIChldmVudCkgPT4ge1xuICAgIGlmIChkZWJ1ZykgY29uc29sZS5sb2coJ1tTZXJ2aWNlIFdvcmtlcl0gTm90aWZpY2F0aW9uIGNsaWNrIFJlY2VpdmVkLicpO1xuXG4gICAgZXZlbnQubm90aWZpY2F0aW9uLmNsb3NlKCk7XG5cbiAgICBjb25zdCB1cmxUb09wZW4gPSBldmVudC5ub3RpZmljYXRpb24uZGF0YT8udXJsIHx8ICcvJztcblxuICAgIGV2ZW50LndhaXRVbnRpbChcbiAgICAgICAgc2VsZi5jbGllbnRzLm1hdGNoQWxsKHsgdHlwZTogJ3dpbmRvdycsIGluY2x1ZGVVbmNvbnRyb2xsZWQ6IHRydWUgfSkudGhlbigod2luZG93Q2xpZW50cykgPT4ge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUgaXMgYWxyZWFkeSBhIHdpbmRvdyBvcGVuIGFuZCBmb2N1cyBpdCBvZiBub3RcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgd2luZG93Q2xpZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNsaWVudCA9IHdpbmRvd0NsaWVudHNbaV07XG4gICAgICAgICAgICAgICAgaWYgKGNsaWVudC51cmwgPT09IHVybFRvT3BlbiAmJiAnZm9jdXMnIGluIGNsaWVudCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2xpZW50LmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgbm90LCB0aGVuIG9wZW4gYSBuZXcgd2luZG93XG4gICAgICAgICAgICBpZiAoc2VsZi5jbGllbnRzLm9wZW5XaW5kb3cpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5jbGllbnRzLm9wZW5XaW5kb3codXJsVG9PcGVuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICApO1xufSk7XG4iXSwibmFtZXMiOlsiZGVidWciLCJzZWxmIiwiYWRkRXZlbnRMaXN0ZW5lciIsImV2ZW50IiwiY29uc29sZSIsImxvZyIsImRhdGEiLCJqc29uIiwidGl0bGUiLCJvcHRpb25zIiwiYm9keSIsImljb24iLCJiYWRnZSIsInVybCIsIndhaXRVbnRpbCIsInJlZ2lzdHJhdGlvbiIsInNob3dOb3RpZmljYXRpb24iLCJlcnIiLCJlcnJvciIsInRleHQiLCJub3RpZmljYXRpb24iLCJjbG9zZSIsInVybFRvT3BlbiIsImNsaWVudHMiLCJtYXRjaEFsbCIsInR5cGUiLCJpbmNsdWRlVW5jb250cm9sbGVkIiwidGhlbiIsIndpbmRvd0NsaWVudHMiLCJpIiwibGVuZ3RoIiwiY2xpZW50IiwiZm9jdXMiLCJvcGVuV2luZG93Il0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./worker/index.ts\n"));

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			if (cachedModule.error !== undefined) throw cachedModule.error;
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/trusted types policy */
/******/ 	!function() {
/******/ 		var policy;
/******/ 		__webpack_require__.tt = function() {
/******/ 			// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.
/******/ 			if (policy === undefined) {
/******/ 				policy = {
/******/ 					createScript: function(script) { return script; }
/******/ 				};
/******/ 				if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {
/******/ 					policy = trustedTypes.createPolicy("nextjs#bundler", policy);
/******/ 				}
/******/ 			}
/******/ 			return policy;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script */
/******/ 	!function() {
/******/ 		__webpack_require__.ts = function(script) { return __webpack_require__.tt().createScript(script); };
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/react refresh */
/******/ 	!function() {
/******/ 		if (__webpack_require__.i) {
/******/ 		__webpack_require__.i.push(function(options) {
/******/ 			var originalFactory = options.factory;
/******/ 			options.factory = function(moduleObject, moduleExports, webpackRequire) {
/******/ 				var hasRefresh = typeof self !== "undefined" && !!self.$RefreshInterceptModuleExecution$;
/******/ 				var cleanup = hasRefresh ? self.$RefreshInterceptModuleExecution$(moduleObject.id) : function() {};
/******/ 				try {
/******/ 					originalFactory.call(this, moduleObject, moduleExports, webpackRequire);
/******/ 				} finally {
/******/ 					cleanup();
/******/ 				}
/******/ 			}
/******/ 		})
/******/ 		}
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	
/******/ 	// noop fns to prevent runtime errors during initialization
/******/ 	if (typeof self !== "undefined") {
/******/ 		self.$RefreshReg$ = function () {};
/******/ 		self.$RefreshSig$ = function () {
/******/ 			return function (type) {
/******/ 				return type;
/******/ 			};
/******/ 		};
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval-source-map devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./worker/index.ts");
/******/ 	
/******/ })()
;