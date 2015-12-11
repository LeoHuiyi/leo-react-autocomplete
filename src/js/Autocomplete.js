import "../css/autocomplete.css";
import React from "react";
import ReactDOM from "react-dom";

function copyProps(props, names){
    let copy = {}, name;

    for(let i = 0, len = names.length; i < len; i++){
        name = names[i];

        if(props[name]){
            copy[name] = props[name];
        }
    }

    return copy;
}

function noop(){}

function cx(classNames) {
    if (typeof classNames === 'object') {
        return Object.keys(classNames).filter(function(className) {
            return classNames[className];
        }).join(' ');
    } else {
        return Array.prototype.join.call(arguments, ' ');
    }
}

const reescaperegex = /[\-\[\]{}()*+?.,\\\^$|#\s]/g;

function escapeRegex( value ) {
    return value.replace(reescaperegex, "\\$&" );
}

function filter(array, term, filterName) {
    let matcher = new RegExp(escapeRegex(term), "i");

    return array.filter((value)=> {
        return matcher.test(value[filterName]);
    });
}

class List extends React.Component {
    constructor(args) {
        super(args);
    }

    handleClick(event, obj){
        if(this.props.disabled){
            return;
        }

        this.props.onSelect(obj);
    }

    handleMouseLeave(event){
        if(this.props.disabled){
            return;
        }

        this.props.mouseLeave(this.props.op, event);
    }

    handleMouseEnter(event){
        if(this.props.disabled){
            return;
        }

        this.props.mouseEnter(this.props.op, event);
    }

    render(){
        let props = this.props;

        return (
            <div
                className={props.opClass}
                tabIndex="-1"
                onClick={(e)=>{this.handleClick(e, {label: props.label, value: props.value})}}
                onMouseEnter={(e)=>{this.handleMouseEnter(e)}}
                onMouseLeave={(e)=>{this.handleMouseLeave(e)}}
                title={this.props.value}
            >
                {this.props.value}
            </div>
        )
    }
};

class Autocomplete extends React.Component {
    constructor(args) {
        super(args);

        let props = this.props;

        this.state = {
            data: props.data,
            visible: props.visible,
            value: '',
            disabled: true,
            loading: false,
            placeholder: props.placeholder,
            virtualBoxTop: 0,
            focusedOption: null
        };

        this.isNotFound = false;
        this.selectedVal = {label: '', value: ''};
    }

    componentDidMount(){
        this.getData();
    }

    componentWillUnmount(){
        if (this._blurTimer) {
            clearTimeout(this._blurTimer);
            this._blurTimer = null;
        }
    }

    componentWillReceiveProps(nextProps){
        if(nextProps.label !== this.props.label){
            this.getSelectedData(nextProps.label);

            return;
        }

        if(nextProps.value !== this.props.value){
            this.getSelectedData(nextProps.value);
        }
    }

    componentWillUpdate(nextProps, nextState){
        if(this.state.value !== nextState.value){
            this.search(nextState.value);
        }
    }

    componentDidUpdate(nextProps, nextState) {
        if(this.isUseVirtualMenuDom){
            let menu = this.refs.menu;
            let virtualBoxTop = this.state.virtualBoxTop;

            if(virtualBoxTop>=0 && menu){
                let menuDOM = ReactDOM.findDOMNode(this.refs.menu);
                let scrollTop = menuDOM.scrollTop;

                if(virtualBoxTop !== scrollTop){
                    menuDOM.scrollTop = virtualBoxTop;
                    this.notScroll = true;
                }
            }
        }else if (this._focusedOptionReveal) {
            if (this.refs.focused && this.refs.menu) {
                let focusedDOM = ReactDOM.findDOMNode(this.refs.focused);
                let menuDOM = ReactDOM.findDOMNode(this.refs.menu);
                let focusedRect = focusedDOM.getBoundingClientRect();
                let menuRect = menuDOM.getBoundingClientRect();

                if (focusedRect.bottom > menuRect.bottom) {
                    menuDOM.scrollTop = focusedDOM.offsetTop + focusedDOM.offsetHeight - menuDOM.offsetHeight;
                }else if(focusedRect.top < menuRect.top){
                    menuDOM.scrollTop = focusedDOM.offsetTop;
                }
            }

            this._focusedOptionReveal = false;
        }
    }

    setData(data){
        let onGetData = this.props.onGetData;

        if(typeof onGetData === 'function'){
            this._data = onGetData(data);
        }else{
            this._data = data
        }
    };

    getSelectedData(val){
        let _data = this._data;

        if(_data.length){
            let valueName = this.props.valueName;
            let labelName = this.props.labelName;
            let keyName = labelName ? labelName : valueName;

            for (let i = 0, len = _data.length; i < len; i++) {
                if(_data[i][keyName] == val){
                    this.setState({
                        value: _data[i][valueName],
                        focusedOption: _data[i]
                    });
                    this.selectedVal = {label: _data[i][labelName], value: _data[i][valueName]};

                    return;
                }
            }
        }

        this.setState({
            value: '',
            focusedOption: null
        });

        this.selectedVal = {label: '', value: ''};
    }

    setLoading(flag){
        this.setState({
            loading: !!flag
        });
    }

    getData(){
        let props = this.props;

        if(typeof props.data.then === 'function'){
            this.setLoading(true);

            props.data.then((data)=> {
                this.setData(data);
                this.search();
                this.getSelectedData(props.label);
                this.setState({
                    disabled: false
                });
                this.setLoading(false);
            });
        }else{
            this.setData(props.data);
            this.search();
            this.getSelectedData(props.label);

            this.setState({
                disabled: false
            });
        }
    }

    handleChange(event){
        if(!this.state.disabled){
            let value = event.target.value;

            this.setState({
                value: value,
                visible: true
            });
        }
    }

    onSelect(obj){
        if(!this.state.disabled && this.state.visible){
            this.setState({
                visible: false,
                value: obj.value
            });

            this.selectedVal = obj;
            this.props.onSelect(obj);
        }
    }

    search(search = '', callback){
        let _data = this._data;
        let data = [];
        let props = this.props;

        search = String(search);
        this.isNotFound = false;

        if(!search || !_data.length){
            data = _data;
        }else{
            let filter = props.filter;
            if(typeof filter === 'function'){
                data = filter(_data, search, props.valueName, props.labelName) || [];
            }else{
                data = filter(_data, search, filter);
            }

            if(!data.length){
                data = [{
                    disabled: true,
                    [props.valueName]: 'Not Found'
                }];

                this.isNotFound = true;
            }
        }

        this.checkFocusedOption(data);

        this.setState({
            data: data
        }, ()=>{
            callback && callback();
            this.virtualTop();
        });
    }

    handleInput(event){
        if(!this.state.disabled){
            event.stopPropagation();

            switch (event.keyCode) {
                case 9: // tab
                    if (event.shiftKey  || !this.refs.input) {
                        return;
                    }

                    ReactDOM.findDOMNode(this.refs.input).blur();
                    this.props.onTab();
                break;
                case 13: // enter
                    if (!this.state.visible || !this.refs.input){
                        return;
                    }

                    this.selectFocusedOption();
                break;
                case 27: // escape
                    if (!this.refs.input){
                        return;
                    }

                    ReactDOM.findDOMNode(this.refs.input).blur();
                break;
                case 38: // up
                    this.focusAdjacentOption('previous');
                break;
                case 40: // down
                    this.focusAdjacentOption('next');
                break;
                default:
                return;
            }

            event.preventDefault();
        }
    }

    selectFocusedOption(){
        if (!this.isNotFound && this.state.focusedOption) {
            let focusedOption = this.state.focusedOption;
            let obj = {
                label: focusedOption[this.props.labelName],
                value: focusedOption[this.props.valueName]
            }

            this.setState({
                value: obj.value,
                visible: false
            });

            this.selectedVal = obj;
            this.props.onSelect(obj);
        }
    }

    checkFocusedOption(data){
        let focusedOption = this.state.focusedOption;
        let item;
        let inData = false;

        data = data || this.state.data;

        for (let i = 0, len = data.length; i < len; i++) {
            item = data[i];
            if(!item.disabled && item === focusedOption){
                inData = true;
                break;
            }
        }

        if(!inData){
            this.setState({
                virtualBoxTop: 0
            });
        }
    }

    focusAdjacentOption(dir) {
        this._focusedOptionReveal = true;

        let ops = this.state.data.filter(function(op) {
            return !op.disabled;
        });
        let stateFocusedOption = this.state.focusedOption;

        if (!this.state.visible) {
            this.setState({
                visible: true,
                focusedOption: stateFocusedOption || ops[dir === 'next' ? 0 : ops.length - 1]
            });

            return;
        }

        if (!ops.length) {
            return;
        }

        let focusedIndex = -1;

        for (let i = 0, len = ops.length; i < len; i++) {
            if (stateFocusedOption === ops[i]) {
                focusedIndex = i;
                break;
            }
        }

        let focusedOption = ops[0];
        if (dir === 'next' && focusedIndex > -1 && focusedIndex < ops.length - 1) {
            focusedOption = ops[focusedIndex + 1];
        } else if (dir === 'previous') {
            if (focusedIndex > 0) {
                focusedOption = ops[focusedIndex - 1];
            } else {
                focusedOption = ops[ops.length - 1];
            }
        }

        this.setState({
            focusedOption: focusedOption
        });
        this.virtualTop(focusedOption);
    }

    getListScrollTop(focusedOption){
        let top = this.state.virtualBoxTop;
        let index = this.state.data.indexOf(focusedOption || this.state.focusedOption);
        let listHeight = this.listHeight;
        let listTop = index * listHeight;
        let listBottom = listTop + listHeight;
        let bottom = top + this.menuHeight;

        if(listTop <= top){
            return listTop;
        }

        if(bottom <= listBottom){
            return listBottom -this.menuHeight + listHeight;
        }

        return -1;
    }

    virtualTop(focusedOption){
        focusedOption = focusedOption || this.state.focusedOption;

        if(this.isUseVirtualMenuDom && focusedOption){
            let scrollTop = this.getListScrollTop(focusedOption);

            if(scrollTop >= 0){
                this.setState({
                    virtualBoxTop: scrollTop
                });
            }
        }
    }

    handleScroll(event){
        if(this.notScroll){
            this.notScroll = false;

            return;
        }

        let scrollTop = event.target.scrollTop;

        this.setState({
            virtualBoxTop: scrollTop
        });
    }

    handleBlur(event){
        if (this._blurTimer) {
            clearTimeout(this._blurTimer);
        }

        this._blurTimer = setTimeout(() => {
            let activeEl = document.activeElement;
            let menu = this.refs.menu;
            let btn = this.refs.btn;
            let input = this.refs.input;
            let menuDom;

            this._blurTimer = null;

            if(btn && activeEl.isEqualNode(ReactDOM.findDOMNode(btn))){
                input && ReactDOM.findDOMNode(input).focus();
            }else if(menu && activeEl.isEqualNode((menuDom = ReactDOM.findDOMNode(menu)))){
                input && ReactDOM.findDOMNode(input).focus();
            }else if(menuDom && menuDom.contains(activeEl)){
                input && ReactDOM.findDOMNode(input).focus();
            }else{
                this.setState({
                    visible: false,
                    value: this.selectedVal.value
                }, ()=> {
                    this.props.onBlur();
                });
            }
        }, 0);
    }

    handleFocus(event){
        if (this._blurTimer) {
            clearTimeout(this._blurTimer);
            this._blurTimer = null;
        }
    }

    handleClick(event){
        if(!this.state.disabled){
            this.setState({
                value: ReactDOM.findDOMNode(this.refs.input).value,
                visible: true
            });
        }
    }

    btnClick(event){
        if(!this.state.disabled){
            if(this.state.visible){
                this.setState({
                    visible: false
                });
            }else{
                let inptu = ReactDOM.findDOMNode(this.refs.input);

                this.setState({
                    value: inptu.value,
                    visible: true
                }, ()=>{
                    inptu.focus();
                });
            }
        }
    }

    focusOption (op) {
        if(!this.state.disabled){
            this.setState({
                focusedOption: op
            });
        }
    }

    unfocusOption (op) {
        if(!this.state.disabled && this.state.focusedOption === op) {
            this.setState({
                focusedOption: null
            });
        }
    }

    clearValue(event){
        if(!this.state.disabled){
            this.setState({
                visible: false,
                value: ''
            }, ()=>{
                ReactDOM.findDOMNode(this.refs.input).focus();
            });

            this.selectedVal = {label: '', value: ''};
            this.props.onSelect({label: '', value: ''});
        }
    }

    reandClearOrLoading(){
        if(this.state.loading){
            return (
                <span className="comboBox-loading">
                    <span className="comboBox-loading-inner" />
                </span>
            );
        }else if(this.selectedVal.value){
            return (
                <span className="comboBox-clear" onClick={(e)=>{this.clearValue(e)}} ref="clear" tabIndex="-1">
                    <span className="comboBox-clear-inner" dangerouslySetInnerHTML={{ __html: '&times;' }} />
                </span>
            );
        }else{
            return null;
        }
    }

    renderComboBox(){
        let props = this.props;
        let state = this.state;
        let style = Object.assign(props.style, {width: props.width});
        let clearOrLoading = this.reandClearOrLoading();
        let inMarrgin = clearOrLoading ? {margin: '0 32px 0 4px'} : {margin: '0 16px 0 4px'};

        return(
            <div className="comboBox" style={style}>
                <div className="comboBox-inputWrap" style={{'outline': 'none'}}>
                    <div style={inMarrgin}>
                        <input
                            ref="input"
                            className="comboBox-input"
                            value={this.state.value}
                            placeholder={state.placeholder}
                            autoComplete="off"
                            disabled={state.disabled}
                            onChange={(e)=>{this.handleChange(e)}}
                            onClick={(e)=>{this.handleClick(e)}}
                            onBlur={(e)=>{this.handleBlur(e)}}
                            onFocus={(e)=>{this.handleFocus(e)}}
                            onKeyDown={(e)=>{this.handleInput(e)}}
                        />
                    </div>
                </div>
                {clearOrLoading}
                <span className="comboBox-btn" tabIndex="-1" onClick={(e)=>{this.btnClick(e)}} ref="btn">
                    <span className="comboBox-btn-arrow"></span>
                </span>
            </div>
        );
    }

    virtualMenuDom(){
        if(!this.state.visible) return;
        let props = this.props;
        let state = this.state;
        let data = state.data;
        let dataLen = data.length;
        let listHeight = this.listHeight = props.listHeight + 1;
        let menuHeight = this.menuHeight = parseInt(props.menuStyle.maxHeight || props.menuStyle.height);
        let menuInnerHeight = dataLen * listHeight;

        if(menuInnerHeight > menuHeight){
            let virtualBoxTop = state.virtualBoxTop || 0;
            let start = Math.floor(virtualBoxTop / listHeight);
            let boxLen = Math.ceil(menuHeight / listHeight);
            let end = start + boxLen;
            let moreEnd;

            if((moreEnd = end - dataLen) > 0){
                end = dataLen;
                start = start - moreEnd;
                virtualBoxTop = virtualBoxTop - listHeight;
            }

            start < 0 && (start = 0);

            let virtualData = this.virtualData = data.slice(start, end);
            let labelName = props.labelName;
            let valueName = props.valueName;
            let selected = props.selected;
            let listSelect = false;
            let focusedOption = state.focusedOption;
            let focusedValue = focusedOption ? focusedOption[valueName] : null;

            focusedValue = focusedValue == null ? data[0] : focusedValue;

            let lists = virtualData.map((item, index)=> {
                let isFocused = focusedValue === item[valueName];
                listSelect = selected === item[valueName] ? true : false;
                let opClass = cx({
                    'listMenu-item': true,
                    'listMenu-item-disabled': item.disabled,
                    'listMenu-item-active': listSelect,
                    'listMenu-item-hover': isFocused
                });

                return (
                    <List
                        label={item[labelName]}
                        value={item[valueName]}
                        key={index}
                        onSelect={(obj)=> {this.onSelect(obj)}}
                        selected={listSelect}
                        focused={isFocused}
                        disabled={item.disabled}
                        ref={isFocused ? 'focused' : null}
                        mouseEnter= {(op)=> {this.focusOption(op)}}
                        mouseLeave={(op)=> {this.unfocusOption(op)}}
                        opClass={opClass} op={item}
                    />
                );
            });

            let style = Object.assign({}, this.props.menuStyle, {width: this.props.width, display:'block'});

            return (<div className="listMenu" style={style} tabIndex="-1" ref="menu" onScroll={(e)=>{this.handleScroll(e)}}>
                    <div style={{height: menuInnerHeight, position: 'relative'}}>
                        <div style={{top: virtualBoxTop, position: 'absolute', left: 0, width: '100%'}}>
                            {lists}
                        </div>
                    </div>
                </div>);
        }else{
            return false;
        }
    }

    renderMenu(){
        let menu = null;

        if(!this.state.disabled && this.state.visible){
            let data = this.state.data;

            this.isUseVirtualMenuDom = false;

            if(data.length){
                if(data.length > this.props.virtualMinLen && (menu = this.virtualMenuDom())){
                    this.isUseVirtualMenuDom = true;
                }else{
                    menu = this.menuDom();
                }
            }
        }

        return menu;
    }

    menuDom(){
        let state = this.state;
        let data = state.data;

        if(state.visible && data.length){
            let props = this.props;
            let lists;
            let labelName = props.labelName;
            let valueName = props.valueName;
            let selected = props.selected;
            let listSelect = false;
            let focusedOption = state.focusedOption;
            let focusedValue = focusedOption ? focusedOption[valueName] : null;

            focusedValue = focusedValue == null ? data[0] : focusedValue;

            lists = data.map((item, index)=> {
                let isFocused = focusedValue === item[valueName];
                listSelect = selected === item[valueName] ? true : false;
                let opClass = cx({
                    'listMenu-item': true,
                    'listMenu-item-disabled': item.disabled,
                    'listMenu-item-active': listSelect,
                    'listMenu-item-hover': isFocused
                });

                return (
                    <List
                        label={item[labelName]}
                        value={item[valueName]}
                        key={index}
                        onSelect={(obj)=> {this.onSelect(obj)}}
                        selected={listSelect} focused={isFocused}
                        disabled={item.disabled} ref={isFocused ? 'focused' : null}
                        mouseEnter= {(op)=> {this.focusOption(op)}}
                        mouseLeave={(op)=> {this.unfocusOption(op)}}
                        opClass={opClass}
                        op={item}
                    />
                );
            });

            this._focusedOptionReveal = true;

            let style = Object.assign({}, this.props.menuStyle, {width: this.props.width, display: 'block'});

            return (<div className="listMenu" style={style} tabIndex="-1" ref="menu">
                    <div>
                        {lists}
                    </div>
                </div>);
        }
    }

    render(){
        let autoCx = this.state.disabled ? "autocomplete is-disabled" : "autocomplete";

        return (
            <div className={autoCx}>
                {this.renderComboBox()}
                {this.renderMenu()}
            </div>
        );
    }
};

Autocomplete.defaultProps = {
    data: {},
    visible: false,
    width: 200,
    style: {},
    value: '',
    placeholder: '',
    labelName: 'key',
    valueName: 'value',
    filter: 'value',
    menuStyle: {},
    onSelect: noop,
    onBlur: noop,
    onTab: noop,
    listHeight: 30,
    virtualMinLen: 50
};

Autocomplete.propTypes = {
    data: React.PropTypes.oneOfType([
        React.PropTypes.array,
        React.PropTypes.object
    ]),
    visible: React.PropTypes.bool,
    width: React.PropTypes.number,
    style: React.PropTypes.object,
    value: React.PropTypes.string,
    placeholder: React.PropTypes.string,
    labelName: React.PropTypes.string,
    valueName: React.PropTypes.string,
    menuStyle: React.PropTypes.object,
    onSelect: React.PropTypes.func,
    onBlur: React.PropTypes.func,
    onTab: React.PropTypes.func,
    listHeight: React.PropTypes.number.isRequired,
    virtualMinLen: React.PropTypes.number,
    filter: React.PropTypes.oneOfType([
        React.PropTypes.string,
        React.PropTypes.func
    ])
}

export default Autocomplete;
