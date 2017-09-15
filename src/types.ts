export type JsonResult = {
    children: JsonResult[];
    type: JsonResultType;
    file: string;
    line: number;
    text: string;
    fullText: string;
};

export type JsonDataResult = {
    file: string;
    results: JsonResult[];
};

export const enum JsonResultType {
    definition = "definition",
    call = "call",
    nested = "nested",
}