var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import lib from '../lib';
import _ from 'lodash';
import '../../lib/dygraph';
export let DygraphsRenderer = class DygraphsRenderer {
    constructor(element, scope) {
        this.element = element;
        this.defaultOptions = {
            connectSeparatedPoints: true,
            customBars: true,
            colors: ['#4FBBCD', '#7355A6', '#C45887', '#F7A626', '#B4CB55', '#D05A5A', '#5DD08B', '#3C8CC7']
        };
        this.presets = {
            'minimal': {
                drawGrid: false,
                legend: 'follow',
                axes: {
                    x: {
                        drawAxis: false
                    },
                    y: {
                        drawAxis: false
                    }
                }
            },
            'full': {
                drawGrid: true,
                legend: 'always',
                labelsDiv: 'chartLegend',
                gridLineColor: '#d3d8de',
                gridLinePattern: [4, 4],
                hideOverlayOnMouseOut: false,
                labelsDivWidth: 100,
                labelsSeparateLines: true,
                axes: {
                    x: {
                        drawAxis: true,
                        axisLineColor: '#c2c8d1'
                    },
                    y: {
                        drawAxis: true,
                        axisLineColor: '#c2c8d1'
                    },
                }
            }
        };
        this.preset = 'minimal';
        scope.$watch(() => this.chart.details, details => {
            if (details)
                this.updateData(details);
        }, true);
        scope.$watch(() => this.preset, preset => {
            console.log('preset: ', preset);
            if (this.dygraph && preset) {
                if (!this.presets[preset])
                    throw `Uknown Dygraphs renderer preset: [${preset}]`;
                this.dygraph = this.buildGraph();
            }
        });
    }
    updateData(metricsData) {
        var temp = {};
        var labels = ['time'];
        var seriesCount = metricsData.map(m => _.keys(m.points).length).reduce((t, v) => t + v);
        metricsData.forEach((m) => {
            _.forEach(m.points, (v, k) => {
                labels.push(`${m.name} - ${k}`);
                if (typeof v[0].data != 'number') {
                    v.forEach(p => {
                        var dp = temp[p.timestamp] || this.makeArray(p.timestamp, seriesCount);
                        dp[labels.length - 1] = (typeof p.data != 'number') ? [p.data.min, p.data.avg, p.data.max] : [p.data, p.data, p.data];
                        temp[p.timestamp] = dp;
                    });
                }
            });
        });
        this.graphData = _(temp).values().sortBy(v => v[0]).value();
        this.graphLabels = labels;
        if (!this.dygraph) {
            this.dygraph = this.buildGraph();
        }
        else {
            this.dygraph.updateOptions(_.defaults({ file: this.graphData, labels: labels }, this.presets[this.preset]));
        }
    }
    makeArray(timestamp, size) {
        var a = [new Date(timestamp)];
        for (let i = 0; i < size; i++) {
            a.push(null);
        }
        return a;
    }
    buildGraph() {
        return new Dygraph(this.element.find("div")[0], this.graphData, _.defaults({ labels: this.graphLabels }, this.presets[this.preset], this.defaultOptions));
    }
};
DygraphsRenderer = __decorate([
    lib.component('rsDygraphsRenderer', {
        require: {
            chart: '^rsChart'
        },
        bindings: {
            preset: '=?'
        },
        templateUrl: 'rs.dygraphsRenderer/dygraphsRenderer/dygraphsRenderer.html'
    }),
    lib.inject(['$element', '$scope']), 
    __metadata('design:paramtypes', [Object, Object])
], DygraphsRenderer);
