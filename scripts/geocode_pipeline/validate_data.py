#!/usr/bin/env python3
"""
IEBC ULTIMATE Data Validation & Quality Report
Comprehensive validation of geocoded data with detailed reporting
"""

import pandas as pd
import json
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# File paths
GEOCODED_CSV = Path("scripts/data/geocoded_iebc_offices.csv")
VALIDATION_REPORT = Path("scripts/data/processed/validation_report.json")
DATA_QUALITY_REPORT = Path("scripts/data/processed/data_quality_report.html")

def safe_string(value, default=""):
    """Safely convert any value to string"""
    if value is None or pd.isna(value):
        return default
    try:
        return str(value).strip()
    except:
        return default

def safe_float(value, default=0.0):
    """Safely convert any value to float"""
    if value is None or pd.isna(value):
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default

def comprehensive_validation(df):
    """Comprehensive validation of geocoded data"""
    validation_results = {
        "summary": {
            "total_offices": len(df),
            "validation_passed": False,
            "overall_score": 0
        },
        "data_quality": {},
        "geocoding_quality": {},
        "issues": [],
        "recommendations": []
    }
    
    if df.empty:
        validation_results["issues"].append("CRITICAL: Dataset is empty")
        return validation_results
    
    # Data Completeness Check
    required_columns = [
        'constituency_code', 'constituency_name', 'county', 
        'office_location', 'landmark', 'distance_from_landmark',
        'latitude', 'longitude', 'geocode_method', 'formatted_address'
    ]
    
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        validation_results["issues"].append(f"Missing columns: {missing_columns}")
    
    # NaN Value Analysis
    nan_analysis = df.isnull().sum()
    total_nans = nan_analysis.sum()
    columns_with_nans = nan_analysis[nan_analysis > 0].to_dict()
    
    validation_results["data_quality"]["nan_analysis"] = {
        "total_nan_values": int(total_nans),
        "columns_with_nans": columns_with_nans,
        "nan_percentage": (total_nans / (len(df) * len(df.columns))) * 100
    }
    
    # Geocoding Success Analysis
    successful_geocodes = len(df[(df['latitude'] != 0.0) & (df['longitude'] != 0.0)])
    failed_geocodes = len(df) - successful_geocodes
    
    validation_results["geocoding_quality"]["success_analysis"] = {
        "successful_geocodes": successful_geocodes,
        "failed_geocodes": failed_geocodes,
        "success_rate": (successful_geocodes / len(df)) * 100
    }
    
    # Accuracy Analysis
    if 'accuracy_meters' in df.columns:
        accuracy_stats = {
            "excellent_under_50m": len(df[df['accuracy_meters'] <= 50]),
            "good_50_100m": len(df[(df['accuracy_meters'] > 50) & (df['accuracy_meters'] <= 100)]),
            "fair_100_500m": len(df[(df['accuracy_meters'] > 100) & (df['accuracy_meters'] <= 500)]),
            "poor_over_500m": len(df[df['accuracy_meters'] > 500]),
            "unknown_accuracy": len(df[df['accuracy_meters'] == 9999.0])
        }
        validation_results["geocoding_quality"]["accuracy_analysis"] = accuracy_stats
    
    # Confidence Analysis
    if 'geocode_confidence' in df.columns:
        confidence_stats = {
            "high_confidence_over_0.8": len(df[df['geocode_confidence'] >= 0.8]),
            "medium_confidence_0.5_0.8": len(df[(df['geocode_confidence'] >= 0.5) & (df['geocode_confidence'] < 0.8)]),
            "low_confidence_under_0.5": len(df[df['geocode_confidence'] < 0.5])
        }
        validation_results["geocoding_quality"]["confidence_analysis"] = confidence_stats
    
    # Provider Analysis
    if 'geocode_method' in df.columns:
        provider_stats = df['geocode_method'].value_counts().to_dict()
        validation_results["geocoding_quality"]["provider_analysis"] = provider_stats
    
    # Coordinate Validation
    kenya_bounds = {
        "min_lat": -4.9, "max_lat": 5.0,
        "min_lon": 33.5, "max_lon": 42.0
    }
    
    valid_coordinates = df[
        (df['latitude'] >= kenya_bounds["min_lat"]) & 
        (df['latitude'] <= kenya_bounds["max_lat"]) &
        (df['longitude'] >= kenya_bounds["min_lon"]) & 
        (df['longitude'] <= kenya_bounds["max_lon"])
    ]
    
    invalid_coordinates = len(df) - len(valid_coordinates)
    validation_results["geocoding_quality"]["coordinate_validation"] = {
        "valid_coordinates": len(valid_coordinates),
        "invalid_coordinates": invalid_coordinates,
        "validity_rate": (len(valid_coordinates) / len(df)) * 100
    }
    
    # Issue Identification
    if total_nans > 0:
        validation_results["issues"].append(f"Found {total_nans} NaN values in dataset")
    
    if failed_geocodes > 0:
        validation_results["issues"].append(f"{failed_geocodes} offices failed geocoding")
    
    if invalid_coordinates > 0:
        validation_results["issues"].append(f"{invalid_coordinates} offices have coordinates outside Kenya")
    
    # Recommendations
    if failed_geocodes > len(df) * 0.1:  # More than 10% failed
        validation_results["recommendations"].append("High failure rate: Consider manual review of failed geocodes")
    
    if 'accuracy_meters' in df.columns and len(df[df['accuracy_meters'] > 500]) > len(df) * 0.2:
        validation_results["recommendations"].append("Many low-accuracy results: Consider re-geocoding with different strategies")
    
    # Overall Score Calculation
    score_components = []
    
    # Data completeness score (30%)
    completeness_score = (1 - (total_nans / (len(df) * len(df.columns)))) * 30
    score_components.append(completeness_score)
    
    # Geocoding success score (40%)
    success_score = (successful_geocodes / len(df)) * 40
    score_components.append(success_score)
    
    # Coordinate validity score (30%)
    validity_score = (len(valid_coordinates) / len(df)) * 30
    score_components.append(validity_score)
    
    overall_score = sum(score_components)
    validation_results["summary"]["overall_score"] = overall_score
    validation_results["summary"]["validation_passed"] = overall_score >= 70
    
    return validation_results

def generate_html_report(validation_results, df):
    """Generate a comprehensive HTML quality report"""
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>IEBC Geocoding Data Quality Report</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; }}
            .header {{ background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }}
            .section {{ margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }}
            .metric {{ display: inline-block; margin: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px; }}
            .good {{ color: #27ae60; }}
            .warning {{ color: #f39c12; }}
            .error {{ color: #e74c3c; }}
            table {{ width: 100%; border-collapse: collapse; }}
            th, td {{ padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }}
            .score {{ font-size: 2em; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🏛️ IEBC Geocoding Data Quality Report</h1>
            <p>Generated on: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
        
        <div class="section">
            <h2>📊 Executive Summary</h2>
            <div class="metric">
                <div class="score { 'good' if validation_results['summary']['overall_score'] >= 70 else 'warning' if validation_results['summary']['overall_score'] >= 50 else 'error' }">
                    {validation_results['summary']['overall_score']:.1f}/100
                </div>
                <div>Overall Quality Score</div>
            </div>
            <div class="metric">
                <div class="score { 'good' if validation_results['summary']['validation_passed'] else 'error' }">
                    {'PASS' if validation_results['summary']['validation_passed'] else 'FAIL'}
                </div>
                <div>Validation Status</div>
            </div>
            <div class="metric">
                <div class="score">{validation_results['summary']['total_offices']}</div>
                <div>Total Offices</div>
            </div>
        </div>
        
        <div class="section">
            <h2>🎯 Geocoding Quality</h2>
            <div class="metric">
                <div class="score good">{validation_results['geocoding_quality']['success_analysis']['successful_geocodes']}</div>
                <div>Successful Geocodes</div>
            </div>
            <div class="metric">
                <div class="score { 'good' if validation_results['geocoding_quality']['success_analysis']['failed_geocodes'] == 0 else 'error' }">
                    {validation_results['geocoding_quality']['success_analysis']['failed_geocodes']}
                </div>
                <div>Failed Geocodes</div>
            </div>
            <div class="metric">
                <div class="score good">{validation_results['geocoding_quality']['success_analysis']['success_rate']:.1f}%</div>
                <div>Success Rate</div>
            </div>
        </div>
    """
    
    # Add provider statistics if available
    if 'provider_analysis' in validation_results['geocoding_quality']:
        html_content += """
        <div class="section">
            <h2>🏆 Provider Performance</h2>
            <table>
                <tr><th>Provider</th><th>Count</th><th>Percentage</th></tr>
        """
        total = sum(validation_results['geocoding_quality']['provider_analysis'].values())
        for provider, count in validation_results['geocoding_quality']['provider_analysis'].items():
            percentage = (count / total) * 100
            html_content += f"<tr><td>{provider}</td><td>{count}</td><td>{percentage:.1f}%</td></tr>"
        html_content += "</table></div>"
    
    # Add accuracy breakdown if available
    if 'accuracy_analysis' in validation_results['geocoding_quality']:
        html_content += """
        <div class="section">
            <h2>📏 Accuracy Breakdown</h2>
            <table>
                <tr><th>Accuracy Level</th><th>Count</th><th>Percentage</th></tr>
        """
        total = sum(validation_results['geocoding_quality']['accuracy_analysis'].values())
        for level, count in validation_results['geocoding_quality']['accuracy_analysis'].items():
            percentage = (count / total) * 100
            html_content += f"<tr><td>{level.replace('_', ' ').title()}</td><td>{count}</td><td>{percentage:.1f}%</td></tr>"
        html_content += "</table></div>"
    
    # Add issues and recommendations
    if validation_results['issues']:
        html_content += """
        <div class="section">
            <h2>⚠️ Issues Identified</h2>
            <ul>
        """
        for issue in validation_results['issues']:
            html_content += f"<li>{issue}</li>"
        html_content += "</ul></div>"
    
    if validation_results['recommendations']:
        html_content += """
        <div class="section">
            <h2>💡 Recommendations</h2>
            <ul>
        """
        for recommendation in validation_results['recommendations']:
            html_content += f"<li>{recommendation}</li>"
        html_content += "</ul></div>"
    
    html_content += """
    </body>
    </html>
    """
    
    return html_content

def main():
    """Main validation function"""
    logger.info("Starting ULTIMATE data validation...")
    
    if not GEOCODED_CSV.exists():
        logger.error(f"Geocoded CSV file not found: {GEOCODED_CSV}")
        return
    
    try:
        # Load geocoded data
        df = pd.read_csv(GEOCODED_CSV)
        logger.info(f"Loaded {len(df)} geocoded rows for validation")
        
        # Run comprehensive validation
        validation_results = comprehensive_validation(df)
        
        # Save validation report
        VALIDATION_REPORT.parent.mkdir(parents=True, exist_ok=True)
        with open(VALIDATION_REPORT, 'w', encoding='utf-8') as f:
            json.dump(validation_results, f, indent=2, ensure_ascii=False, default=str)
        
        # Generate HTML report
        html_report = generate_html_report(validation_results, df)
        with open(DATA_QUALITY_REPORT, 'w', encoding='utf-8') as f:
            f.write(html_report)
        
        # Print summary
        logger.info("=== ULTIMATE VALIDATION SUMMARY ===")
        logger.info(f"Overall Quality Score: {validation_results['summary']['overall_score']:.1f}/100")
        logger.info(f"Validation Status: {'PASS' if validation_results['summary']['validation_passed'] else 'FAIL'}")
        logger.info(f"Total Offices: {validation_results['summary']['total_offices']}")
        logger.info(f"Successful Geocodes: {validation_results['geocoding_quality']['success_analysis']['successful_geocodes']}")
        logger.info(f"Success Rate: {validation_results['geocoding_quality']['success_analysis']['success_rate']:.1f}%")
        
        if validation_results['issues']:
            logger.warning("ISSUES FOUND:")
            for issue in validation_results['issues']:
                logger.warning(f"  - {issue}")
        else:
            logger.info("✅ No major issues found")
        
        if validation_results['recommendations']:
            logger.info("RECOMMENDATIONS:")
            for recommendation in validation_results['recommendations']:
                logger.info(f"  - {recommendation}")
        
        logger.info(f"📋 Detailed report saved to: {VALIDATION_REPORT}")
        logger.info(f"🌐 HTML report saved to: {DATA_QUALITY_REPORT}")
        
        return validation_results['summary']['validation_passed']
        
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        raise

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)