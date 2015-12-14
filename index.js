import React from "react";
import ReactDOM from "react-dom";
import {Autocomplete} from "./src/index.js";

function getData(num){
    let arr = [];

    while(num --){
        arr.push({
            key: num,
            value: `leo${num}`
        });
    }

    return arr;
}

ReactDOM.render(
    <Autocomplete
        width={396}
        data={getData(10000)}
        value={'leo100'}
        filter={(data, search, value, label)=> {
            return data = data.filter((item)=> {
                return item[value].indexOf(search) > -1;
            });
        }}
        menuStyle={{'maxHeight': '200px'}}
    />,
    document.getElementById('content')
);
