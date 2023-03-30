import Core from 'css-modules-loader-core';
import { Plugin } from 'postcss';
declare type Dictionary<T> = {
    [key: string]: T | undefined;
};
export default class FileSystemLoader {
    private root;
    private sources;
    private importNr;
    private core;
    tokensByFile: Dictionary<Core.ExportTokens>;
    constructor(root: string, plugins?: Array<Plugin<any>>);
    fetch(_newPath: string, relativeTo: string, _trace?: string, initialContents?: string): Promise<Core.ExportTokens>;
}
export {};
