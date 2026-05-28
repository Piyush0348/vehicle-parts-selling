// GlobalExceptionMiddleware.cs
using System.Text.Json;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger)
    {
        _next   = next;
        _logger = logger;
    }

    public async Task Invoke(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception occurred.");

            // Preserve CORS headers that were already set
            var origin = context.Request.Headers["Origin"].ToString();
            if (!string.IsNullOrEmpty(origin))
            {
                context.Response.Headers["Access-Control-Allow-Origin"]
                    = origin;
                context.Response.Headers["Access-Control-Allow-Credentials"]
                    = "true";
                context.Response.Headers["Access-Control-Allow-Methods"]
                    = "GET, POST, PUT, DELETE, OPTIONS";
                context.Response.Headers["Access-Control-Allow-Headers"]
                    = "Content-Type, Authorization";
            }

            context.Response.StatusCode  = 500;
            context.Response.ContentType = "application/json";

            var response = new
            {
                message   = "An unexpected error occurred.",
                requestId = context.TraceIdentifier
            };

            await context.Response.WriteAsync(
                JsonSerializer.Serialize(response));
        }
    }
}