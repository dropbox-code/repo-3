// Copyright (c) 2020 The Jaeger Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"fmt"
	"log"
	"os"

	"github.com/open-telemetry/opentelemetry-collector/config"
	"github.com/open-telemetry/opentelemetry-collector/config/configmodels"
	"github.com/open-telemetry/opentelemetry-collector/service"
	"github.com/open-telemetry/opentelemetry-collector/service/builder"
	"github.com/spf13/viper"

	jflags "github.com/jaegertracing/jaeger/cmd/flags"
	ingesterApp "github.com/jaegertracing/jaeger/cmd/ingester/app"
	"github.com/jaegertracing/jaeger/cmd/opentelemetry-collector/app"
	"github.com/jaegertracing/jaeger/cmd/opentelemetry-collector/app/defaults"
	jconfig "github.com/jaegertracing/jaeger/pkg/config"
	"github.com/jaegertracing/jaeger/plugin/storage"
)

func main() {
	handleErr := func(err error) {
		if err != nil {
			log.Fatalf("Failed to run the service: %v", err)
		}
	}

	info := service.ApplicationStartInfo{
		ExeName:  "jaeger-opentelemetry-ingester",
		LongName: "Jaeger OpenTelemetry Ingester",
		// TODO
		//Version:  version.Version,
		//GitHash:  version.GitHash,
	}

	v := viper.New()

	storageType := os.Getenv(storage.SpanStorageTypeEnvVar)
	if storageType == "" {
		storageType = "cassandra"
	}

	cmpts := defaults.Components(v)
	cfgFactory := func(otelViper *viper.Viper, f config.Factories) (*configmodels.Config, error) {
		cfg, err := defaults.IngesterConfig(storageType, cmpts)
		if err != nil {
			return nil, err
		}
		if len(builder.GetConfigFile()) > 0 {
			otelCfg, err := service.FileLoaderConfigFactory(otelViper, f)
			if err != nil {
				return nil, err
			}
			err = defaults.MergeConfigs(cfg, otelCfg)
			if err != nil {
				return nil, err
			}
		}
		return cfg, nil
	}

	svc, err := service.New(service.Parameters{
		ApplicationStartInfo: info,
		Factories:            cmpts,
		ConfigFactory:        cfgFactory,
	})
	handleErr(err)

	// Add Jaeger specific flags to service command
	// this passes flag values to viper.
	storageFlags, err := app.StorageFlags(storageType)
	if err != nil {
		handleErr(err)
	}

	cmd := svc.Command()
	jconfig.AddFlags(v,
		cmd,
		jflags.AddConfigFileFlag,
		ingesterApp.AddFlags,
		storageFlags,
	)

	// parse flags to propagate Jaeger config file flag value to viper
	cmd.ParseFlags(os.Args)
	err = jflags.TryLoadConfigFile(v)
	if err != nil {
		handleErr(fmt.Errorf("could not load Jaeger configuration file %w", err))
	}

	err = svc.Start()
	handleErr(err)
}
