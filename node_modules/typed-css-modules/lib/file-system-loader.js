"use strict";
/* this file is forked from https://raw.githubusercontent.com/css-modules/css-modules-loader-core/master/src/file-system-loader.js */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const css_modules_loader_core_1 = __importDefault(require("css-modules-loader-core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util = __importStar(require("util"));
const readFile = util.promisify(fs.readFile);
class FileSystemLoader {
    constructor(root, plugins) {
        this.root = root;
        this.sources = {};
        this.importNr = 0;
        this.core = new css_modules_loader_core_1.default(plugins);
        this.tokensByFile = {};
    }
    async fetch(_newPath, relativeTo, _trace, initialContents) {
        const newPath = _newPath.replace(/^["']|["']$/g, '');
        const trace = _trace || String.fromCharCode(this.importNr++);
        const relativeDir = path.dirname(relativeTo);
        const rootRelativePath = path.resolve(relativeDir, newPath);
        let fileRelativePath = path.resolve(path.join(this.root, relativeDir), newPath);
        const isNodeModule = (fileName) => fileName[0] !== '.' && fileName[0] !== '/';
        // if the path is not relative or absolute, try to resolve it in node_modules
        if (isNodeModule(newPath)) {
            try {
                fileRelativePath = require.resolve(newPath);
            }
            catch (e) { }
        }
        let source;
        if (!initialContents) {
            const tokens = this.tokensByFile[fileRelativePath];
            if (tokens) {
                return tokens;
            }
            try {
                source = await readFile(fileRelativePath, 'utf-8');
            }
            catch (error) {
                if (relativeTo && relativeTo !== '/') {
                    return {};
                }
                throw error;
            }
        }
        else {
            source = initialContents;
        }
        const { injectableSource, exportTokens } = await this.core.load(source, rootRelativePath, trace, this.fetch.bind(this));
        const re = new RegExp(/@import\s'(\D+?)';/, 'gm');
        let importTokens = {};
        let result;
        while ((result = re.exec(injectableSource))) {
            const importFile = result === null || result === void 0 ? void 0 : result[1];
            if (importFile) {
                let importFilePath = isNodeModule(importFile)
                    ? importFile
                    : path.resolve(path.dirname(fileRelativePath), importFile);
                const localTokens = await this.fetch(importFilePath, relativeTo, undefined, initialContents);
                Object.assign(importTokens, localTokens);
            }
        }
        const tokens = { ...exportTokens, ...importTokens };
        this.sources[trace] = injectableSource;
        this.tokensByFile[fileRelativePath] = tokens;
        return tokens;
    }
}
exports.default = FileSystemLoader;
//# sourceMappingURL=file-system-loader.js.map