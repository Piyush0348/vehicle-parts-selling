public class ExternalServicesOptions
{
    public string PaymentApiUrl { get; set; } = string.Empty;

    public int TimeoutSeconds { get; set; }
    public string ApiKey { get; set; } = string.Empty;

    public string MerchantId { get; set; } = string.Empty;

    public string MerchantName { get; set; } = string.Empty;
}
