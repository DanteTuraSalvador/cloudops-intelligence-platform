using Serilog;
using CloudOps.CostAnalyzer.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "CloudOps Cost Analyzer API", Version = "v1" });
});

// Register application services
builder.Services.AddSingleton<ICostAnalysisService, CostAnalysisService>();
builder.Services.AddSingleton<IForecastService, ForecastService>();

// AWS SDK configuration
builder.Services.AddDefaultAWSOptions(builder.Configuration.GetAWSOptions());

// Health checks
builder.Services.AddHealthChecks();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseSerilogRequestLogging();
app.MapControllers();
app.MapHealthChecks("/health");

Log.Information("CloudOps Cost Analyzer starting on port {Port}",
    Environment.GetEnvironmentVariable("ASPNETCORE_URLS") ?? "http://+:3002");

app.Run();
