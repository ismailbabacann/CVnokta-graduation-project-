FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Sln ve csproj dosyalarını kopyala
COPY ["CleanArchitecture.sln", "./"]
COPY ["CleanArchitecture/CleanArchitecture.WebApi/CleanArchitecture.WebApi.csproj", "CleanArchitecture/CleanArchitecture.WebApi/"]
COPY ["CleanArchitecture/CleanArchitecture.Application/CleanArchitecture.Core.csproj", "CleanArchitecture/CleanArchitecture.Application/"]
COPY ["CleanArchitecture/CleanArchitecture.Infrastructure/CleanArchitecture.Infrastructure.csproj", "CleanArchitecture/CleanArchitecture.Infrastructure/"]
COPY ["Tests/CleanArchitecture.Infrastructure.Tests/CleanArchitecture.Infrastructure.Tests.csproj", "Tests/CleanArchitecture.Infrastructure.Tests/"]
COPY ["Tests/CleanArchitecture.UnitTests/CleanArchitecture.UnitTests.csproj", "Tests/CleanArchitecture.UnitTests/"]

# Restore işlemi
RUN dotnet restore "CleanArchitecture.sln"

# Tüm kodları kopyala
COPY . .

# Build işlemi
WORKDIR "/src/CleanArchitecture/CleanArchitecture.WebApi"
RUN dotnet build "CleanArchitecture.WebApi.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "CleanArchitecture.WebApi.csproj" -c Release -o /app/publish

# Run image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "CleanArchitecture.WebApi.dll"]
