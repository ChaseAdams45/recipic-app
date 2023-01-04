import * as React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Linking,
  Button
} from "react-native";

import { ListItem, Avatar} from "@rneui/themed";

//import { , Button } from "react-native";

{/* const data = new Array(16).fill({
  title: 'Recipe',
  description: 'Description for recipe',
  url: 'https://assets.bonappetit.com/photos/62e03050cd52c75bb21bebbc/master/pass/choco-taco.jpg',
}); */}

function create_ohe(cv_ingredients){
    ingredients_list = ['banana', 'bellpepper', 'bread', 'butter', 'carrot', 'cheese', 'chicken', 'cucumber', 'egg', 'greenbeans', 'lemon', 'lettuce', 'lime', 'milk', 'mushrooms', 'onion', 'potato', 'tomato', 'tortilla', 'zucchini'];
    ohe_ingredients = new Array(ingredients_list.length).fill(0);
    // Creates One Hot Encoding of the initial ingredients
    for (let i = 0; i < cv_ingredients.length; i++) {
        for (let j = 0; j < ingredients_list.length; j++) {
            if(cv_ingredients[i]===(ingredients_list[j])){
                ohe_ingredients[j] = 1;
                break;
            }
            } 
        }
    return ohe_ingredients
} 


function find_matching(ohe_cv, ohe_recipe){
    const indices = [];
    for (let i = 0; i < ohe_cv.length; i++) {
        if(ohe_cv[i] == 1 && ohe_recipe[i]==1){
            indices.push(i);
        }
    }
    return indices;
}

function ingredient_search(cv_ingredients) {
    // Returns the list of recipes
    var recipe_json = require('../recipes.json'); //(with path)
    ohe_cv = create_ohe(cv_ingredients=cv_ingredients)
    const recipes = []
    for (let i = 0; i < recipe_json.length; i++) {
        curr_recipe = recipe_json[i]
        ip_temp = curr_recipe['ingredient_presence'];
        matching_indices = find_matching(ohe_cv, ip_temp)
        if (matching_indices.length!==0){
            recipes.push(curr_recipe)
        }
        
        } 
    return recipes;
    }





export default function RecipeScreen({route}) {
  const {boundingBoxes}= route.params;
  console.log(boundingBoxes)
  var results = [];
  for (var i = 0; i < boundingBoxes.length; i++) {
    results.push(boundingBoxes[i].objectClass);
  }
  //var results = JSON.parse(boundingBoxes.objectClass);
  console.log(results)
  const data = ingredient_search(results);


  return(
    <ScrollView style={styles.container}>
      {
        data.map((l, i) => (
          <ListItem key={i} bottomDivider>
            <Avatar source={{uri: l.image_url}} />
            <ListItem.Content>
              <ListItem.Title>{l.title}</ListItem.Title>
              <ListItem.Subtitle>{l.ingredients.toString()}</ListItem.Subtitle>
            </ListItem.Content>
            <Button title='GO' onPress={() => Linking.openURL(l.url)}/>
          </ListItem>
        ))
      }
    </ScrollView>
  )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    marginHorizontal: 5
  },
});