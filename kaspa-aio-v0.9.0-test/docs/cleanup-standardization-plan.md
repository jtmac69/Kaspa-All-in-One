# Test Cleanup Standardization Plan

## Overview

This document outlines the plan to standardize cleanup functionality across all test scripts in the Kaspa All-in-One project.

## Current Status

### ✅ Enhanced Scripts (Complete)
- **test-kasia-indexer.sh** - Full cleanup system implemented
- **test-kasia-app.sh** - Full cleanup system implemented  
- **test-service-dependencies.sh** - Full cleanup system implemented
- **cleanup-tests.sh** - Comprehensive centralized cleanup script

### 🔄 Scripts Needing Enhancement
- **test-kaspa-node.sh** - Has basic cleanup, needs standardization
- **test-kaspa-node-only.sh** - Has basic cleanup, needs standardization

## Standardized Cleanup Features

All test scripts should include:

### 🔧 Core Functionality
1. **Automatic Cleanup on Exit**
   - Exit traps (`trap cleanup_on_exit EXIT INT TERM`)
   - Cleanup on test failure or success
   - Graceful service shutdown

2. **Manual Cleanup Options**
   - `--cleanup-only` - Run cleanup without tests
   - `--cleanup-full` - Full cleanup including volumes and networks
   - `--cleanup-volumes` - Remove data volumes (with warnings)
   - `--cleanup-images` - Remove unused Docker images
   - `--no-cleanup` - Disable automatic cleanup

3. **Safety Features**
   - Data volume protection by default
   - Confirmation prompts for destructive actions
   - Clear logging of cleanup actions
   - Error handling for missing resources

### 📋 Implementation Checklist

For each script that needs enhancement:

#### Phase 1: Core Cleanup Functions
- [ ] Add `cleanup_containers()` function with basic/full modes
- [ ] Add `cleanup_on_exit()` function with exit code handling
- [ ] Add `cleanup_full()` function for comprehensive cleanup
- [ ] Add `setup_cleanup_trap()` function with configurable traps

#### Phase 2: Command Line Options
- [ ] Add argument parsing for cleanup options
- [ ] Add `--cleanup-only` mode handling
- [ ] Add `--cleanup-full` mode handling
- [ ] Add `--cleanup-volumes` and `--cleanup-images` options
- [ ] Add `--no-cleanup` option to disable automatic cleanup

#### Phase 3: Help and Documentation
- [ ] Update help messages to include cleanup options
- [ ] Add `show_cleanup_help()` function
- [ ] Update script documentation

#### Phase 4: Testing and Validation
- [ ] Test all cleanup modes
- [ ] Verify trap functionality
- [ ] Test with various exit scenarios
- [ ] Update centralized cleanup script if needed

## Script-Specific Requirements

### test-kaspa-node.sh
**Current State**: Has basic cleanup with trap
**Containers to Clean**: 
- `kaspa-node` (compose service)
- `kaspa-node-test` (potential test containers)

**Enhancement Needed**:
- Add standardized cleanup options
- Enhance container detection and cleanup
- Add volume and network cleanup options
- Improve error handling

### test-kaspa-node-only.sh  
**Current State**: Has basic cleanup, no trap
**Containers to Clean**:
- `kaspa-node` (from docker-compose.test.yml)
- `kaspa-node-test` (potential test containers)

**Enhancement Needed**:
- Add automatic cleanup trap
- Add standardized cleanup options
- Add comprehensive container cleanup
- Add safety features and confirmations

## Implementation Template

### Standard Cleanup Functions Template
```bash
# Cleanup functions
cleanup_containers() {
    local cleanup_level=${1:-basic}
    
    log_info "Cleaning up containers..."
    
    # Stop and remove test containers
    local test_containers=("kaspa-node-test" "other-test-containers")
    for container in "${test_containers[@]}"; do
        if docker ps -a --format "{{.Names}}" | grep -q "^${container}$"; then
            log_info "Removing test container: $container"
            docker stop "$container" 2>/dev/null || true
            docker rm "$container" 2>/dev/null || true
        fi
    done
    
    # Stop compose services
    log_info "Stopping compose services..."
    docker-compose down 2>/dev/null || true
    
    if [ "$cleanup_level" = "full" ]; then
        # Full cleanup logic
        # ... volumes, networks, images
    fi
}

cleanup_on_exit() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Test failed with exit code $exit_code"
        log_info "Performing cleanup due to test failure..."
    else
        log_info "Test completed, performing cleanup..."
    fi
    
    cleanup_containers basic
    exit $exit_code
}

# Configuration
ENABLE_CLEANUP=true
CLEANUP_VOLUMES=false
CLEANUP_IMAGES=false

setup_cleanup_trap() {
    if [ "$ENABLE_CLEANUP" = "true" ]; then
        trap cleanup_on_exit EXIT INT TERM
        log_info "Cleanup trap enabled (use --no-cleanup to disable)"
    else
        log_info "Cleanup disabled"
    fi
}
```

### Standard Argument Parsing Template
```bash
# Parse command line arguments for cleanup options
CLEANUP_ONLY=false
FULL_CLEANUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --cleanup-only)
            CLEANUP_ONLY=true
            shift
            ;;
        --cleanup-full)
            FULL_CLEANUP=true
            shift
            ;;
        --cleanup-volumes)
            CLEANUP_VOLUMES=true
            shift
            ;;
        --cleanup-images)
            CLEANUP_IMAGES=true
            shift
            ;;
        --no-cleanup)
            ENABLE_CLEANUP=false
            shift
            ;;
        -h|--help)
            show_usage
            show_cleanup_help
            exit 0
            ;;
        *)
            log_warning "Unknown option: $1"
            shift
            ;;
    esac
done

# Handle cleanup-only mode
if [ "$CLEANUP_ONLY" = true ]; then
    log_info "Running cleanup only..."
    if [ "$FULL_CLEANUP" = true ]; then
        cleanup_full
    else
        cleanup_containers basic
    fi
    log_success "Cleanup completed!"
    exit 0
fi

# Setup cleanup trap
setup_cleanup_trap
```

## Benefits of Standardization

### 🎯 For Developers
- **Consistent Interface**: Same cleanup options across all test scripts
- **Reliable Testing**: No leftover containers or resources
- **Easy Debugging**: `--no-cleanup` option for investigation
- **Safe Operations**: Protected data volumes and confirmation prompts

### 🚀 For CI/CD
- **Clean Environments**: Guaranteed cleanup between test runs
- **Resource Management**: Prevents container and volume accumulation
- **Failure Handling**: Cleanup runs even when tests fail
- **Automation Friendly**: Force mode for unattended operation

### 🛡️ For Production
- **Data Safety**: Volumes protected by default
- **Selective Cleanup**: Choose what to clean up
- **Dry Run Mode**: Preview cleanup actions
- **Comprehensive Coverage**: All test artifacts handled

## Timeline

### Phase 1: test-kaspa-node.sh Enhancement (Priority)
- **Estimated Time**: 2-3 hours
- **Impact**: High (most commonly used test script)
- **Dependencies**: None

### Phase 2: test-kaspa-node-only.sh Enhancement  
- **Estimated Time**: 1-2 hours
- **Impact**: Medium (specialized use case)
- **Dependencies**: None

### Phase 3: Future Test Scripts
- **Estimated Time**: 30 minutes per script
- **Impact**: Ongoing maintenance
- **Dependencies**: Template established

## Success Criteria

### ✅ Completion Checklist
- [ ] All test scripts support standardized cleanup options
- [ ] All test scripts have automatic cleanup traps
- [ ] All test scripts include safety features and confirmations
- [ ] cleanup-tests.sh updated to handle all test containers
- [ ] Documentation updated with new cleanup options
- [ ] All cleanup functionality tested and validated

### 🧪 Testing Validation
- [ ] `--cleanup-only` works for all scripts
- [ ] `--cleanup-full` properly handles volumes and networks
- [ ] `--no-cleanup` disables automatic cleanup
- [ ] Trap functionality works on exit, interrupt, and termination
- [ ] Dry run mode shows correct cleanup actions
- [ ] Force mode bypasses confirmations appropriately

## Maintenance

### 📋 Ongoing Tasks
1. **New Test Scripts**: Apply standardized cleanup template
2. **Regular Testing**: Validate cleanup functionality periodically  
3. **Documentation Updates**: Keep cleanup docs current
4. **Community Feedback**: Incorporate user suggestions and improvements

### 🔄 Future Enhancements
- **Parallel Cleanup**: Speed up cleanup for multiple containers
- **Selective Container Cleanup**: Target specific container patterns
- **Cleanup Metrics**: Track cleanup performance and effectiveness
- **Integration Testing**: Automated cleanup validation in CI/CD

This standardization ensures a consistent, reliable, and safe testing environment across the entire Kaspa All-in-One project.