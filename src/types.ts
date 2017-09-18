export type JsonResult = {
    children: JsonResult[];
    type: JsonResultType;
    file: string;
    line: number;
    text: string;
    fullTextIndex: number | undefined;
};

export type JsonDataResult = {
    file: string;
    results: JsonResult[];
    fullTextIndex: number;
};

export const enum JsonResultType {
    definition = "definition",
    call = "call",
    nested = "nested",
    file = "file",
}
