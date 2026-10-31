export interface QueryResultBase {
  rowsAffected: number;
}

export type Row = Record<string, unknown>;
export type Rows = Row[];

export interface QueryResult extends QueryResultBase {
  rows: Rows;
}
