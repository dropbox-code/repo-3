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

package defaults

import (
	"sort"
	"testing"

	"github.com/open-telemetry/opentelemetry-collector/config"
	"github.com/open-telemetry/opentelemetry-collector/config/configmodels"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/jaegertracing/jaeger/cmd/opentelemetry-collector/app/exporter/cassandra"
	"github.com/jaegertracing/jaeger/cmd/opentelemetry-collector/app/exporter/elasticsearch"
	"github.com/jaegertracing/jaeger/cmd/opentelemetry-collector/app/exporter/kafka"
	"github.com/jaegertracing/jaeger/ports"
)

func TestDefaultConfig(t *testing.T) {
	factories := Components(viper.New())
	disabledHostPort := ports.PortToHostPort(0)
	tests := []struct {
		storageType    string
		zipkinHostPort string
		exporterTypes  []string
		pipeline       map[string]*configmodels.Pipeline
		err            string
	}{
		{
			storageType:    "elasticsearch",
			zipkinHostPort: disabledHostPort,
			exporterTypes:  []string{elasticsearch.TypeStr},
			pipeline: map[string]*configmodels.Pipeline{
				"traces": {
					InputType:  configmodels.TracesDataType,
					Receivers:  []string{"jaeger"},
					Exporters:  []string{elasticsearch.TypeStr},
					Processors: []string{"batch"},
				},
			},
		},
		{
			storageType:    "cassandra",
			zipkinHostPort: disabledHostPort,
			exporterTypes:  []string{cassandra.TypeStr},
			pipeline: map[string]*configmodels.Pipeline{
				"traces": {
					InputType:  configmodels.TracesDataType,
					Receivers:  []string{"jaeger"},
					Exporters:  []string{cassandra.TypeStr},
					Processors: []string{"batch"},
				},
			},
		},
		{
			storageType:    "kafka",
			zipkinHostPort: disabledHostPort,
			exporterTypes:  []string{kafka.TypeStr},
			pipeline: map[string]*configmodels.Pipeline{
				"traces": {
					InputType:  configmodels.TracesDataType,
					Receivers:  []string{"jaeger"},
					Exporters:  []string{kafka.TypeStr},
					Processors: []string{"batch"},
				},
			},
		},
		{
			storageType:    "cassandra,elasticsearch",
			zipkinHostPort: disabledHostPort,
			exporterTypes:  []string{cassandra.TypeStr, elasticsearch.TypeStr},
			pipeline: map[string]*configmodels.Pipeline{
				"traces": {
					InputType:  configmodels.TracesDataType,
					Receivers:  []string{"jaeger"},
					Exporters:  []string{cassandra.TypeStr, elasticsearch.TypeStr},
					Processors: []string{"batch"},
				},
			},
		},
		{
			storageType:    "cassandra",
			zipkinHostPort: ":9411",
			exporterTypes:  []string{cassandra.TypeStr},
			pipeline: map[string]*configmodels.Pipeline{
				"traces": {
					InputType:  configmodels.TracesDataType,
					Receivers:  []string{"jaeger", "zipkin"},
					Exporters:  []string{cassandra.TypeStr},
					Processors: []string{"batch"},
				},
			},
		},
		{
			storageType: "floppy",
			err:         "unknown storage type: floppy",
		},
	}
	for _, test := range tests {
		t.Run(test.storageType, func(t *testing.T) {
			cfg, err := Config(test.storageType, test.zipkinHostPort, factories)
			if test.err != "" {
				require.Nil(t, cfg)
				assert.EqualError(t, err, test.err)
				return
			}
			require.NoError(t, err)
			require.NoError(t, config.ValidateConfig(cfg, zap.NewNop()))

			assert.Equal(t, 1, len(cfg.Extensions))
			assert.Equal(t, 1, len(cfg.Service.Extensions))
			assert.Equal(t, "health_check", cfg.Service.Extensions[0])
			assert.Equal(t, "health_check", cfg.Extensions["health_check"].Name())
			assert.Equal(t, len(test.pipeline["traces"].Receivers), len(cfg.Receivers))
			assert.Equal(t, "jaeger", cfg.Receivers["jaeger"].Name())
			assert.Equal(t, 1, len(cfg.Processors))
			assert.Equal(t, "batch", cfg.Processors["batch"].Name())
			assert.Equal(t, len(test.exporterTypes), len(cfg.Exporters))

			types := []string{}
			for _, v := range cfg.Exporters {
				types = append(types, v.Type())
			}
			sort.Strings(types)
			assert.Equal(t, test.exporterTypes, types)
			assert.EqualValues(t, test.pipeline, cfg.Service.Pipelines)
		})
	}
}
