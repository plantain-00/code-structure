export type JsonResult = {
    children: JsonResult[];
    type: "definition" | "call";
    file: string;
    line: number;
    text: string;
};

export type JsonDataResult = {
    file: string;
    results: JsonResult[];
};
