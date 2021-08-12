export class ApiKey {
  api_key_id: string;
  is_enabled: number;
  permissions: Set<string[]>;
  public_key: string;
  user_id: string;
}
