export class SubscribeDto {
  deviceToken?: string;
  platform?: 'web' | 'ios' | 'android';
  endpoint?: string;
}
